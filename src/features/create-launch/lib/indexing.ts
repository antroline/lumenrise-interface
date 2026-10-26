/**
 * Waits for the server to index a confirmed launch. After the factory
 * transaction confirms on Stellar, the server reads the launch from the
 * contract itself; until then the public launch endpoint answers 404. That
 * gap is expected and must never be reported as a transaction failure or
 * trigger another launch transaction.
 */

import { ApiError } from '@/lib/api/client';
import { getIndexedLaunch } from '@/lib/api/launches/public';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { ConfirmationTimeoutError, waitForTransactionResult } from '../../../lib/stellar/confirmation';

function retryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === 'network' || error.code === 'timeout') return true;
    // 404: not indexed yet. 503: temporary server trouble, not a launch failure.
    return error.status === 404 || error.status === 503;
  }
  return false;
}

/**
 * Polls the public launch endpoint until the contract is indexed ('ready') or
 * the ten-second deadline runs out ('pending').
 */
export async function waitForIndexedLaunch(
  slug: string,
  network: ApiNetwork,
  timeoutMs?: number,
): Promise<'ready' | 'pending'> {
  try {
    return await waitForTransactionResult(slug, async () => {
      try {
        await getIndexedLaunch(slug, { network });
        return 'ready' as const;
      } catch (error) {
        if (!retryable(error)) throw error;
      }
    }, timeoutMs);
  } catch (error) {
    if (error instanceof ConfirmationTimeoutError) return 'pending';
    throw error;
  }
}
