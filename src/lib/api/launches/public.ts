/**
 * Public launch reads.
 *
 * `GET /launches/:contractId` needs no `X-User-Id` or other credential. A 404
 * after a confirmed transaction means the server has not indexed the launch
 * yet; it is not an on-chain failure.
 */

import { apiRequest } from '../client';
import type { ApiNetwork } from './types';

/**
 * Resolves once the launch contract is indexed. The response body is not
 * needed by the launch flow, only the fact that the server has it.
 */
export async function getIndexedLaunch(
  contractId: string,
  options: { network: ApiNetwork; signal?: AbortSignal },
): Promise<void> {
  await apiRequest<unknown>(
    `/launches/${encodeURIComponent(contractId)}?network=${options.network}`,
    { signal: options.signal },
  );
}
