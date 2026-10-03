import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  rpc,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";

export const NETWORK = Networks.TESTNET;
export const LOCK_CONTRACT_ID =
  "CAP4INYPX7MRQJXLDVO5PU6MTB22QPZMOJSEPEF3R3QZXMR2A6JO2X7K";
export const horizon = new Horizon.Server(
  "https://horizon-testnet.stellar.org",
);
export const soroban = new rpc.Server("https://soroban-testnet.stellar.org");

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
      Operation.createAccount({ destination: issuer, startingBalance: "2" }),
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
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function submitIssuance(xdr: string) {
  const transaction = TransactionBuilder.fromXDR(xdr, NETWORK) as Transaction;
  return horizon.submitTransaction(transaction);
}
