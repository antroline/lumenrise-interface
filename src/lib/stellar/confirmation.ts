import { scValToNative } from '@stellar/stellar-sdk';
import { soroban } from '@/lib/stellar/clients';

/** Retry lookups only. A missing result never triggers another submission. */
export async function waitForTransactionResult<T>(
  hash: string,
  lookup: () => Promise<T | undefined>,
): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await lookup();
    if (result !== undefined) return result;
    if (attempt < 9)
      await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(
    `Transaction ${hash} is still pending. Check its confirmation before submitting again.`,
  );
}

export function waitForTransaction(hash: string) {
  return waitForTransactionResult(hash, async () => {
    const result = await soroban.getTransaction(hash);
    return result.status === 'NOT_FOUND' ? undefined : result;
  });
}

export async function confirmTransaction(hash: string) {
  const result = await waitForTransaction(hash);
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
    const result = await confirmTransaction(hash);
    return {
      hash,
      raw: result,
      returnValue: async () => result.returnValue ? scValToNative(result.returnValue) : null,
    };
  }
}
