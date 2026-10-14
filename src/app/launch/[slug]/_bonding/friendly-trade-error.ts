import { errorMessage } from './contract';

/** Wallet and RPC failures arrive as long technical blobs; show short, actionable text instead. */
export function friendlyError(cause: unknown, fallback: string): string {
  const raw = errorMessage(cause);
  const text = raw.toLowerCase();
  if (/declined|rejected|cancelled|canceled/.test(text))
    return 'The trade was cancelled in your wallet.';
  if (/insufficient|not enough|balance too low/.test(text))
    return 'Your wallet balance is too low for this trade.';
  if (/failed on-chain/.test(text))
    return 'The trade failed on-chain. Request a new quote and retry.';
  if (
    raw.length <= 160 &&
    !/[{}]|0x[0-9a-f]{8,}|error\(|panic|wasm|hosterror|simulation/i.test(raw)
  )
    return raw;
  return fallback;
}
