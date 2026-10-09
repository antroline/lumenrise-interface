import type { useBlux } from '@bluxcc/react';
import { BASE_FEE, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { horizon, NETWORK, soroban } from '@/app/create/_launch/transactions';
import { balanceLine, parseAmount, trusts, type Tokens } from './contract';

export async function confirmTransaction(hash: string) {
  const result = await soroban.pollTransaction(hash, { attempts: 30 });
  if (result.status === 'FAILED') throw new Error(`Transaction ${hash} failed on-chain.`);
  if (result.status !== 'SUCCESS')
    throw new Error(`Transaction ${hash} is still pending. Check its confirmation before submitting another trade.`);
  return result;
}

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
    const result = await sendTransaction(tx.toXDR(), { network: NETWORK });
    if (!result || typeof result !== 'object' || !('hash' in result) || typeof result.hash !== 'string')
      throw new Error('The wallet did not return a trustline transaction hash.');
    onTrustline(result.hash);
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
