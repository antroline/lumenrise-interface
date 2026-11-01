'use client';
import { useState } from 'react';
import { tradeTableClass } from './trade-table-style';
import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useIndexedTrades } from './use-indexed-trades';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TradeFilter } from './trade-filter';
import { TradeTooltipText } from './trade-tooltip';
import { IndexedTradeRow } from './indexed-trade-row';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import type { ApiNetwork } from '@/lib/api/launches/types';

export function IndexedTrades({
  slug,
  network,
  ticker,
  pair,
  tradeCount24h,
  volume24h,
}: {
  slug: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
  tradeCount24h?: number;
  volume24h?: string;
}) {
  const {
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
  } = useIndexedTrades(slug, network);
  const scope = JSON.stringify([slug, network, side, size, period]);
  const [pagination, setPagination] = useState({ scope, page: 0 });
  if (pagination.scope !== scope) setPagination({ scope, page: 0 });
  const pageSize = 10;
  const lastLoadedPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const page = pagination.scope === scope ? Math.min(pagination.page, lastLoadedPage) : 0;
  const pageTrades = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const canGoNext = page < lastLoadedPage || query.hasNextPage;

  async function nextPage() {
    if (page >= lastLoadedPage) {
      const result = await query.fetchNextPage();
      if (result.isError) return;
    }
    setPagination(current => current.scope === scope ? { scope, page: page + 1 } : current);
  }
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-labelledby="trades-heading"
    >
      <div className="sr-only">
        <h3 id="trades-heading" className="sr-only">
          Recent trades
        </h3>
        <p className="sr-only">
          {tradeCount24h !== undefined &&
            `${tradeCount24h.toLocaleString('en-US')} trades in 24h · `}
          Execution prices in {pair}, before fees.
          {volume24h !== undefined && (
            <span className="mt-1 block tabular-nums sm:hidden">
              24h volume · {volume24h} {pair}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TradeFilter
          label="Trade side"
          value={side}
          options={[
            { value: 'all', label: 'All trades' },
            { value: 'buy', label: 'Buys' },
            { value: 'sell', label: 'Sells' },
          ]}
          onChange={(value) => {
            if (value === 'all' || value === 'buy' || value === 'sell')
              setSide(value);
          }}
        />
        <TradeFilter
          label="Trade size"
          value={size}
          options={[
            { value: 'all', label: 'Any size' },
            { value: 'small', label: `Under 1K ${ticker}` },
            { value: 'large', label: `1K ${ticker} or more` },
          ]}
          onChange={setSize}
        />
        <TradeFilter
          label="Trade time"
          value={period}
          options={[
            { value: 'all', label: 'Any time' },
            { value: 'hour', label: 'Last hour' },
            { value: 'day', label: 'Last 24h' },
          ]}
          onChange={(value) => {
            setFilterAsOf(Date.now());
            setPeriod(value);
          }}
        />
      </div>
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
      ) : (
        <Table
          className={cn(
            tradeTableClass,
            '[&_tbody_tr>td:first-child]:rounded-none [&_tbody_tr>td:last-child]:rounded-none [&_tbody_tr:not(:last-child)>td]:border-b [&_tbody_tr:not(:last-child)>td]:border-divider',
          )}
        >
          <TableHeader>
            <TableRow>
              {[
                'Time',
                'Trade',
                `Value · ${pair}`,
                ticker,
                `Price · ${pair}`,
              ].map((label) => (
                <TableHead
                  key={label}
                  className="h-9 bg-muted py-2 text-xs font-medium normal-case tracking-normal text-muted-foreground first:rounded-l-lg last:rounded-r-lg"
                >
                  <TradeTooltipText
                    content={
                      label.startsWith('Value')
                        ? 'Recorded pair amount before creator fees.'
                        : label.startsWith('Price')
                          ? 'Average execution price for the recorded trade, before fees. This may differ from the current marginal price.'
                          : undefined
                    }
                  >
                    {label}
                  </TradeTooltipText>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageTrades.map((trade, index) => (
              <IndexedTradeRow
                key={`${trade.trader}:${trade.tradedAt}:${index}`}
                trade={trade}
                amountScale={trade.amountScale}
                priceScale={trade.priceScale}
                asOf={asOf}
              />
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <ArrowRightLeft aria-hidden="true" className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No recorded trades</EmptyTitle>
                      <EmptyDescription>
                        Trades matching these filters will appear here when
                        available. Indexed history may still be synchronizing.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
      {(size !== 'all' || period !== 'all') && (
        <p className="text-small text-muted-foreground">
          Size and time filters apply to loaded trades.
        </p>
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
      {(filtered.length > 0 || query.hasNextPage) && (
        <nav aria-label="Recent trades pagination" className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
            Page {page + 1}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || query.isFetchingNextPage}
              onClick={() => setPagination({ scope, page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoNext || query.isFetching}
              onClick={nextPage}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Next'}
            </Button>
          </div>
        </nav>
      )}
    </section>
  );
}
