'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { StrKey } from '@stellar/stellar-sdk';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { getTrades } from '@/lib/api/launches/market';
import { displayAmount } from '@/lib/api/launches/display';
import {
  launchKey,
  publicQueryOptions,
  usePageVisible,
} from '@/lib/api/launches/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';

export function IndexedTrades({
  address,
  network,
  ticker,
  pair,
}: {
  address: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
}) {
  const [side, setSide] = useState<'all' | 'buy' | 'sell'>('all');
  const [entry, setEntry] = useState(''),
    [trader, setTrader] = useState(''),
    [error, setError] = useState('');
  const visible = usePageVisible(),
    client = useQueryClient();
  const query = useInfiniteQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, address), 'trades', side, trader],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getTrades(
        address,
        network,
        {
          cursor: pageParam,
          side: side === 'all' ? undefined : side,
          trader: trader || undefined,
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
        queryKey: [...launchKey(network, address), 'trades', side, trader],
      });
  }, [visible, client, address, network, side, trader]);
  function filter(event: FormEvent) {
    event.preventDefault();
    const value = entry.trim();
    if (value && !StrKey.isValidEd25519PublicKey(value)) {
      setError('Enter a valid Stellar account address.');
      return;
    }
    setError('');
    setTrader(value);
  }
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby="trades-heading"
    >
      <div>
        <h2 id="trades-heading" className="text-title font-semibold">
          Recent trades
        </h2>
        <p className="mt-1 text-small text-muted-foreground">
          Recorded trades · Average execution price in {pair}, before fees.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          value={[side]}
          aria-label="Trade side"
          onValueChange={(values) => {
            if (
              values[0] === 'all' ||
              values[0] === 'buy' ||
              values[0] === 'sell'
            )
              setSide(values[0]);
          }}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="buy">Buy</ToggleGroupItem>
          <ToggleGroupItem value="sell">Sell</ToggleGroupItem>
        </ToggleGroup>
        <form onSubmit={filter} className="flex min-w-0 flex-1 gap-2">
          <Input
            aria-label="Filter by trader address"
            aria-invalid={!!error}
            placeholder="Trader address (optional)"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
          <Button variant="outline" type="submit">
            Filter
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-44 w-full" />
      ) : query.isError && !query.data ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Could not load trades</EmptyTitle>
            <EmptyDescription>{query.error.message}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Empty>
      ) : query.data?.pages.some((p) => p.items.length) ? (
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Trader',
                'Time',
                'Token',
                'Side',
                'Amount',
                `Price · ${pair}`,
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.pages.flatMap((page, pageIndex) =>
              page.items.map((trade, index) => (
                <TableRow key={`${pageIndex}:${index}`}>
                  <TableCell title={trade.trader} className="font-mono">
                    {trade.trader.slice(0, 6)}…{trade.trader.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <time dateTime={trade.tradedAt}>
                      {new Date(trade.tradedAt).toLocaleString('en-US')}
                    </time>
                  </TableCell>
                  <TableCell title={trade.asset}>{ticker}</TableCell>
                  <TableCell>{trade.side === 'buy' ? 'Buy' : 'Sell'}</TableCell>
                  <TableCell className="tabular-nums">
                    {displayAmount(trade.assetAmount)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {displayAmount(trade.executionPrice)}
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No recorded trades</EmptyTitle>
            <EmptyDescription>
              Trades matching these filters will appear here when available.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {query.isError && query.data && (
        <p role="alert" className="text-small text-destructive">
          Could not refresh trades.{' '}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </p>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more trades'}
        </Button>
      )}
    </section>
  );
}
