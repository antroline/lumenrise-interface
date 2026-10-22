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

/** Bounded 5–15 second backoff between index checks. */
const POLL_DELAYS_MS = [
  5_000, 5_000, 8_000, 8_000, 12_000, 12_000, 15_000, 15_000, 15_000, 15_000,
];

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
 * the attempt budget runs out ('pending'). Callers keep the transaction hash
 * and contract id either way so the check can run again later.
 */
export async function waitForIndexedLaunch(
  slug: string,
  network: ApiNetwork,
): Promise<'ready' | 'pending'> {
  for (let attempt = 0; ; attempt++) {
    try {
      await getIndexedLaunch(slug, { network });
      return 'ready';
    } catch (error) {
      if (!retryable(error)) throw error;
    }
    const delay = POLL_DELAYS_MS[attempt];
    if (delay === undefined) return 'pending';
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
