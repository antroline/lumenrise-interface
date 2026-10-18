import { getLaunchList, getMarket } from '@/lib/api/launches/market';
import type { LaunchResult, MarketResult } from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';

export const DIRECTORY_PAGE_SIZE = 20;
export const DIRECTORY_MAX_PROJECTS = 200;
export const DIRECTORY_MAX_MARKETS = 40;

/** Bounded reads only: never describe a truncated collection as global results. */
export async function getDirectory(
  network: ApiNetwork,
  owner?: string,
  signal?: AbortSignal,
) {
  const first = await getLaunchList(network, 1, DIRECTORY_PAGE_SIZE, owner, signal);
  if (first.page !== 1 || first.limit < 1)
    throw new Error('The project list returned invalid pagination. Please retry.');
  if (first.total > DIRECTORY_MAX_PROJECTS)
    return { ...first, complete: false };
  const pages = Math.ceil(first.total / first.limit);
  if (pages > DIRECTORY_MAX_PROJECTS / DIRECTORY_PAGE_SIZE)
    return { ...first, complete: false };
  const launches = [...first.launches];
  for (let page = 2; page <= pages; page++) {
    const next = await getLaunchList(network, page, first.limit, owner, signal);
    if (
      next.page !== page ||
      next.limit !== first.limit ||
      next.total !== first.total
    )
      throw new Error('The project list changed while loading. Please retry.');
    launches.push(...next.launches);
  }
  if (new Set(launches.map((l) => l.contractId)).size !== first.total)
    throw new Error('The project list changed while loading. Please retry.');
  return { ...first, launches, complete: true };
}

/** Recent metrics have no batch endpoint. Limit the collection and concurrency. */
export async function getDirectoryMarkets(
  launches: LaunchResult[],
  network: ApiNetwork,
  signal?: AbortSignal,
) {
  if (launches.length > DIRECTORY_MAX_MARKETS)
    throw new Error('Recent rankings are unavailable for this directory size.');
  const markets = new Map<string, MarketResult>();
  for (let offset = 0; offset < launches.length; offset += 4) {
    const batch = await Promise.all(
      launches.slice(offset, offset + 4).map(async (launch) => {
        const market = await getMarket(launch.contractId, network, signal);
        if (market.pair !== launch.pair || market.asset !== launch.asset)
          throw new Error('Recent rankings returned different trading assets. Please retry.');
        return market;
      }),
    );
    for (const market of batch) markets.set(market.contractId, market);
  }
  return markets;
}
