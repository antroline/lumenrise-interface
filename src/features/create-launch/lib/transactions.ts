import {
  Asset,
  AuthImmutableFlag,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { horizon, NETWORK, soroban } from '../../../lib/stellar/clients';

export { horizon, NETWORK, soroban, API_NETWORK } from '../../../lib/stellar/clients';

export const assetFor = (code: string, issuer: string) =>
  new Asset(code, issuer);

export function buildSetup(
  account: Horizon.AccountResponse,
  issuer: string,
  code: string,
) {
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.createAccount({ destination: issuer, startingBalance: '1.1' }),
    )
    .addOperation(Operation.changeTrust({ asset: assetFor(code, issuer) }))
    .setTimeout(180)
    .build();
}

export function buildIssuance(
  account: Horizon.AccountResponse,
  secret: string,
  creator: string,
  code: string,
  amount: string,
) {
  // Blux's email wallet rejects operations sourced from this separate issuer.
  // Sign locally, then submit only after the wallet-funded setup confirms.
  const homeDomain = process.env.NEXT_PUBLIC_STELLAR_HOME_DOMAIN?.trim();
  if (!homeDomain) {
    throw new Error(
      'NEXT_PUBLIC_STELLAR_HOME_DOMAIN is required for issuance.',
    );
  }
  const issuer = Keypair.fromSecret(secret);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.payment({
        destination: creator,
        asset: assetFor(code, issuer.publicKey()),
        amount,
      }),
    )
    .addOperation(Operation.setOptions({ homeDomain }))
    .addOperation(Operation.setOptions({ setFlags: AuthImmutableFlag }))
    .addOperation(Operation.setOptions({ masterWeight: 0 }))
    .setTimeout(0)
    .build();
  transaction.sign(issuer);
  return transaction;
}

export async function buildSacDeployment(
  account: Horizon.AccountResponse,
  code: string,
  issuer: string,
) {
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.createStellarAssetContract({ asset: assetFor(code, issuer) }),
    )
    .setTimeout(180)
    .build();
  return soroban.prepareTransaction(transaction);
}

export function transactionHash(transaction: { hash(): Uint8Array }) {
  return Array.from(transaction.hash(), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function submitIssuance(xdr: string) {
  const transaction = TransactionBuilder.fromXDR(xdr, NETWORK);
  return horizon.submitTransaction(transaction);
}
