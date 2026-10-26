import { soroban } from '@/lib/stellar/clients';

export const CONFIRMATION_TIMEOUT_MS = 10_000;

export class ConfirmationTimeoutError extends Error {
  constructor() {
    super('There was a problem confirming the transaction within 10 seconds.');
  }
}

/** Retry lookups only. A missing result never triggers another submission. */
export async function waitForTransactionResult<T>(
  _hash: string,
  lookup: () => Promise<T | undefined>,
  timeoutMs = CONFIRMATION_TIMEOUT_MS,
): Promise<T> {
  if (timeoutMs <= 0) throw new ConfirmationTimeoutError();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    for (let attempt = 0; attempt < 10 && !stopped; attempt++) {
      const result = await lookup();
      if (stopped) throw new ConfirmationTimeoutError();
      if (result !== undefined) return result;
      if (attempt < 9)
        await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new ConfirmationTimeoutError();
  };
  try {
    return await Promise.race([
      poll(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ConfirmationTimeoutError()), Math.max(0, timeoutMs));
      }),
    ]);
  } finally {
    stopped = true;
    clearTimeout(timer);
  }
}

export function waitForTransaction(hash: string, timeoutMs?: number) {
  return waitForTransactionResult(hash, async () => {
    const result = await soroban.getTransaction(hash);
    return result.status === 'NOT_FOUND' ? undefined : result;
  }, timeoutMs);
}

export async function confirmTransaction(hash: string, timeoutMs?: number) {
  const result = await waitForTransaction(hash, timeoutMs);
  if (result.status !== 'SUCCESS')
    throw new Error(`Transaction ${hash} failed on-chain.`);
  return result;
}

/** Blux can time out after broadcasting, before returning its submission result. */
export async function recoverSubmittedTransaction<T>(
  submit: () => Promise<T>,
  onPending: (hash: string) => void,
) {
  try {
    return await submit();
  } catch (cause) {
    const hash = cause instanceof Error
      ? /^BLUX: Timed out waiting for transaction ([a-f0-9]{64}) to finalize\.$/i.exec(cause.message)?.[1]
      : undefined;
    if (!hash) throw cause;
    onPending(hash);
    // Let the caller do its single bounded confirmation check.
    return { hash };
  }
}
