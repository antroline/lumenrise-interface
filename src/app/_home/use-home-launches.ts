'use client';

import { getConfiguration } from '@/lib/api/config';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  publicQueryOptions,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import type { CurveModelInput } from '@/features/launches/lib/curve-model';
import {
  getLaunchList,
  launchListKey,
  type Bonding,
} from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { getApiChain } from '@/lib/api/client';
import { routeNetwork } from '@/lib/chain-address';
import { discoverLaunches, type HomeLaunch } from './home-discovery';

export type { HomeLaunch } from './home-discovery';
export { progressLabel } from './home-discovery';

/** Same page size as /projects, so both routes share one cached first page. */


const byTime =
  (key: 'startsAt' | 'endsAt', direction: 1 | -1) =>
  (a: HomeLaunch, b: HomeLaunch) => {
    const aTime = a.bonding[key],
      bTime = b.bonding[key];
    if (aTime === null) return bTime === null ? 0 : 1;
    if (bTime === null) return -1;
    const left = BigInt(aTime);
    const right = BigInt(bTime);
    return left === right ? 0 : (left < right ? -1 : 1) * direction;
  };

export function useHomeLaunches(network: ApiNetwork) {
  const PAGE_SIZE = getConfiguration().rules.launches.defaultLimit;
  const visible = usePageVisible();
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: launchListKey(network, 1, PAGE_SIZE),
    queryFn: ({ signal }) => getLaunchList(network, 1, PAGE_SIZE, undefined, signal),
    enabled: visible,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({ queryKey: launchListKey(network, 1, PAGE_SIZE) });
  }, [client, network, visible, PAGE_SIZE]);

  const { launches, open, recent, featured } = discoverLaunches(query.data?.launches ?? []);
  const status = (value: Bonding['status']) =>
    launches.filter((launch) => launch.bonding.status === value);

  return {
    query,
    launches,
    recent,
    featured,
    total: query.data?.total ?? 0,
    loaded: query.data?.launches.length ?? 0,
    open,
    endingSoon: open
      .filter((launch) => launch.bonding.endsAt !== null)
      .sort(byTime('endsAt', 1)),
    scheduled: status('Scheduled').sort(byTime('startsAt', 1)),
    graduated: status('Graduated').sort(byTime('endsAt', -1)),
    failed: status('Failed').sort(byTime('endsAt', -1)),
  };
}

/** "3d 4h", "5h 12m", "12m": compact time until a unix-seconds deadline. */
export function timeUntil(seconds: string | null, now: number) {
  if (seconds === null) return 'No expiry';
  const minutes = Math.floor((Number(seconds) * 1000 - now) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'now';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export const launchHref = (launch: HomeLaunch, network: ApiNetwork) =>
  launch.slug ? `/projects/${encodeURIComponent(launch.slug)}?network=${routeNetwork(network)}` : `/projects?network=${routeNetwork(network)}`;

export const networkName = (network: ApiNetwork) =>
  `${getApiChain() === 'base' ? 'Base' : 'Stellar'} ${network === 'public' ? 'Mainnet' : 'Testnet'}`;

export function curveInput(bonding: Bonding): CurveModelInput {
  return {
    base: BigInt(bonding.curve.virtualBaseReserve),
    quote: BigInt(bonding.curve.virtualQuoteReserve),
    capacity: BigInt(bonding.buckets.curve),
    sold: BigInt(bonding.state.sold),
    target: BigInt(bonding.curve.graduationTarget),
  };
}
