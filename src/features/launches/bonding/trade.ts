import type { useBlux } from '@bluxcc/react';
import { BASE_FEE, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { horizon, NETWORK } from '@/lib/stellar/clients';
import { balanceLine, parseAmount, trusts, type Tokens } from './contract';
import { confirmTransaction, recoverSubmittedTransaction } from '../../../lib/stellar/confirmation';

export { confirmTransaction };

export async function ensureTradeTrustlines(
  owner: string,
  tokens: Tokens,
  buying: boolean,
  sendTransaction: ReturnType<typeof useBlux>['sendTransaction'],
  onTrustline: (hash: string) => void,
  onStage: (message: string) => void,
) {
  let account = await horizon.loadAccount(owner);
  // Classic operations cannot be mixed with a Soroban invocation. Confirm the
  // trustline transaction first so the subsequent trade can be simulated.
  const needed = [tokens.asset, ...(buying ? [] : [tokens.pair])]
    .filter(asset => !trusts(account, asset));
  if (needed.length) {
    const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK });
    for (const asset of needed) builder.addOperation(Operation.changeTrust({ asset }));
    const tx = builder.setTimeout(180).build();
    onStage('Approve the missing trustline(s). The trade will need a second approval after confirmation.');
    let pendingHash: string | undefined;
    const recordHash = (hash: string) => {
      if (pendingHash === hash) return;
      pendingHash = hash;
      onTrustline(hash);
    };
    const result = await recoverSubmittedTransaction(
      () => sendTransaction(tx.toXDR(), { network: NETWORK }),
      recordHash,
    );
    if (!result || typeof result !== 'object' || !('hash' in result) || typeof result.hash !== 'string')
      throw new Error('The wallet did not return a trustline transaction hash.');
    recordHash(result.hash);
    await confirmTransaction(result.hash);
    account = await horizon.loadAccount(owner);
  }
  for (const asset of [tokens.asset, tokens.pair]) {
    const line = balanceLine(account, asset);
    if (line && 'is_authorized' in line && !line.is_authorized)
      throw new Error(`The ${asset.getCode()} trustline is not authorized by its issuer.`);
  }
  return account;
}

export function checkReceivingCapacity(
  account: Awaited<ReturnType<typeof horizon.loadAccount>>,
  tokens: Tokens,
  buying: boolean,
  amount: bigint,
) {
  const asset = buying ? tokens.asset : tokens.pair;
  if (asset.isNative() || asset.getIssuer() === account.account_id) return;
  const line = balanceLine(account, asset);
  if (!line || !('limit' in line)) throw new Error(`The ${asset.getCode()} trustline is missing.`);
  const liabilities = 'buying_liabilities' in line ? parseAmount(line.buying_liabilities, true) : BigInt(0);
  if (parseAmount(line.balance, true) + liabilities + amount > parseAmount(line.limit, true))
    throw new Error(`The ${asset.getCode()} trustline limit is too low to receive this trade. Increase it in your wallet.`);
}
