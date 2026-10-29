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
export function useIndexedTrades(slug: string, network: ApiNetwork) {
  const [side, setSide] = useState<'all' | 'buy' | 'sell'>('all');
  const [size, setSize] = useState('all');
  const [period, setPeriod] = useState('all');
  const [filterAsOf, setFilterAsOf] = useState(() => Date.now());
  const visible = usePageVisible(),
    client = useQueryClient();
  const query = useInfiniteQuery({
    ...publicQueryOptions,
    refetchInterval: 3_000,
    queryKey: [...launchKey(network, slug), 'trades', side],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getTrades(
        slug,
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
    enabled: visible && !!slug,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, slug), 'trades', side],
      });
  }, [visible, client, slug, network, side]);
  const trades = query.data?.pages.flatMap((page) => page.items) ?? [];
  const scale = query.data?.pages[0]?.amountScale;
  const threshold = scale === undefined ? undefined : BigInt(1000) * BigInt(10) ** BigInt(scale);
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
      (size === 'all' || threshold !== undefined &&
        (size === 'small'
          ? amount < threshold
          : amount >= threshold))
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
