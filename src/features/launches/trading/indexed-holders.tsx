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
import { formatHolderBalance } from '@/lib/api/launches/holders';
import type { useHolders } from '@/features/launches/hooks/use-holders';
import { TradeTooltipText } from './trade-tooltip';

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
      {query.isPending ? (
        <div
          role="status"
          aria-label="Loading holders"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {[0, 1, 2].map((key) => (
            <Skeleton
              key={key}
              className="h-24 w-full rounded-lg motion-reduce:animate-none"
            />
          ))}
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
        <ul
          aria-label="Holder wallets"
          className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {items.map((holder) => (
            <li
              key={holder.address}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Blockie
                  seed={holder.address}
                  size={20}
                  className="shrink-0 rounded-full"
                />
                <span className="truncate text-[11px] text-muted-foreground">
                  <TradeTooltipText content={holder.address}>
                    {holder.address.slice(0, 4)}…{holder.address.slice(-4)}
                  </TradeTooltipText>
                </span>
              </div>
              <p className="min-w-0 break-words text-base leading-tight font-medium tabular-nums">
                <TradeTooltipText
                  content={`Indexed balance observed at ${new Date(holder.observedAt).toUTCString()}. May be delayed.`}
                >
                  {query.data &&
                    formatHolderBalance(holder.balance, query.data.amountScale)}
                </TradeTooltipText>
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  {ticker}
                </span>
              </p>
            </li>
          ))}
        </ul>
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
