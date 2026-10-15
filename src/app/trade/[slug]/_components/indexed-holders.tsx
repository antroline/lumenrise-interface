'use client';

import { Blockie } from '@/components/blockie';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatHolderBalance } from '@/lib/api/launches/holders';
import type { useHolders } from '@/lib/api/launches/use-holders';
import { tradeTableClass } from './trade-table-style';

export function IndexedHolders({
  holders,
  ticker,
}: {
  holders: ReturnType<typeof useHolders>;
  ticker: string;
}) {
  const { query, items, cursor, pending, loadMore, pageError } = holders;
  const error = pageError ?? (query.isError ? query.error : undefined);
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Known holders">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted-foreground">
          {query.data
            ? `${query.data.totalHolders.toLocaleString('en-US')} known holders. `
            : ''}
          Known holders from recorded trades; balance updates may be delayed.
          This is not a complete on-chain holder index.
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={query.isFetching || pending}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </div>
      {query.isPending ? (
        <div role="status" aria-label="Loading holders">
          <Skeleton className="h-44 w-full" />
        </div>
      ) : query.isError && !query.data ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Could not load holders</EmptyTitle>
            <EmptyDescription>{query.error.message}</EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </Empty>
      ) : !items.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No holder data available yet</EmptyTitle>
            <EmptyDescription>
              Balances appear after recorded trades are processed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className={tradeTableClass}>
          <TableHeader>
            <TableRow>
              {['Holder', `Balance · ${ticker}`].map((label) => (
                <TableHead
                  key={label}
                  className="h-10 bg-muted py-3 text-small normal-case tracking-normal first:rounded-l-2xl last:rounded-r-2xl"
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((holder) => (
              <TableRow key={holder.address} className="rounded-2xl">
                <TableCell title={holder.address}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Blockie
                      seed={holder.address}
                      size={16}
                      className="rounded-full"
                    />
                    <span className="text-muted-foreground">
                      {holder.address.slice(0, 6)}…{holder.address.slice(-4)}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className="tabular-nums"
                  title={`Snapshot: ${holder.observedAt}`}
                >
                  {query.data &&
                    formatHolderBalance(holder.balance, query.data.amountScale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {error && query.data && (
        <p role="alert" className="text-small text-destructive">
          {error.message}{' '}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || query.isFetching}
            onClick={() => void (pageError ? loadMore() : query.refetch())}
          >
            Retry
          </Button>
        </p>
      )}
      {cursor != null && (
        <Button
          variant="outline"
          disabled={pending || query.isFetching}
          onClick={() => void loadMore()}
        >
          {pending ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </section>
  );
}
