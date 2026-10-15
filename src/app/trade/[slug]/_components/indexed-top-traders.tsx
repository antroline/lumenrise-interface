'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Blockie } from '@/components/blockie';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { displayAmount } from '@/lib/api/launches/display';
import { getTopTraders } from '@/lib/api/launches/top-traders';
import { launchKey, publicQueryOptions, usePageVisible } from '@/lib/api/launches/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { tradeTableClass } from './trade-table-style';

export function IndexedTopTraders({ address, network, pair }: {
  address: string;
  network: ApiNetwork;
  pair: string;
}) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, address), 'top-traders', 'all', 10],
    queryFn: ({ signal }) => getTopTraders(address, network, signal),
    enabled: visible,
  });
  useEffect(() => {
    if (!visible) void client.cancelQueries({ queryKey: [...launchKey(network, address), 'top-traders'] });
  }, [visible, client, address, network]);

  if (query.isPending) return <Skeleton className="h-44 w-full" aria-label="Loading top traders" />;
  if (query.isError && !query.data) return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Could not load top traders</EmptyTitle>
        <EmptyDescription>{query.error.message}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button>
    </Empty>
  );
  if (!query.data?.items.length) return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No recorded traders yet</EmptyTitle>
        <EmptyDescription>Traders will appear after their trades are recorded.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Top 10 traders by estimated volume">
      <Table className={tradeTableClass}>
        <TableHeader>
          <TableRow>
            {['Rank', 'Trader', `Volume · ${pair} ≈`, `Bought · ${pair} ≈`, `Sold · ${pair} ≈`, 'Trades'].map(label => (
              <TableHead key={label} className="h-10 whitespace-nowrap bg-muted py-3 text-small normal-case tracking-normal first:rounded-l-2xl last:rounded-r-2xl">{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data.items.map((trader, index) => (
            <TableRow key={trader.trader} className="rounded-2xl">
              <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell title={trader.trader}>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Blockie seed={trader.trader} size={16} className="rounded-full" />
                  <span className="text-muted-foreground">{trader.trader.slice(0, 6)}…{trader.trader.slice(-4)}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap font-semibold tabular-nums">{displayAmount(trader.volume, 3)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{displayAmount(trader.buyVolume, 3)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{displayAmount(trader.sellVolume, 3)}</TableCell>
              <TableCell className="tabular-nums">{trader.tradeCount.toLocaleString('en-US')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-small text-muted-foreground">All recorded trades · estimated before fees</p>
      {query.isError && (
        <p role="alert" className="text-small text-destructive">
          Could not refresh top traders.{' '}
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry</Button>
        </p>
      )}
    </section>
  );
}
