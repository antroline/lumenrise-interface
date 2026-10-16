'use client';
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getTrades } from '@/lib/api/launches/market';
import {
  launchKey,
  publicQueryOptions,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
export function useIndexedTrades(address: string, network: ApiNetwork) {
  const [side, setSide] = useState<'all' | 'buy' | 'sell'>('all');
  const [size, setSize] = useState('all');
  const [period, setPeriod] = useState('all');
  const [filterAsOf, setFilterAsOf] = useState(() => Date.now());
  const visible = usePageVisible(),
    client = useQueryClient();
  const query = useInfiniteQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, address), 'trades', side],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getTrades(
        address,
        network,
        {
          cursor: pageParam,
          side: side === 'all' ? undefined : side,
        },
        signal,
      ),
    getNextPageParam: (last, _pages, _param, params) =>
      last.nextCursor !== null && !params.includes(last.nextCursor)
        ? last.nextCursor
        : undefined,
    enabled: visible,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, address), 'trades', side],
      });
  }, [visible, client, address, network, side]);
  const trades = query.data?.pages.flatMap((page) => page.items) ?? [];
  const asOf = Math.max(filterAsOf, query.dataUpdatedAt);
  const cutoff =
    period === 'hour'
      ? asOf - 3_600_000
      : period === 'day'
        ? asOf - 86_400_000
        : 0;
  const filtered = trades.filter((trade) => {
    const amount = BigInt(trade.assetAmount);
    return (
      Date.parse(trade.tradedAt) >= cutoff &&
      (size === 'all' ||
        (size === 'small'
          ? amount < BigInt(10_000_000_000)
          : amount >= BigInt(10_000_000_000)))
    );
  });
  return {
    side,
    setSide,
    size,
    setSize,
    period,
    setPeriod,
    setFilterAsOf,
    asOf,
    filtered,
    query,
  };
}
