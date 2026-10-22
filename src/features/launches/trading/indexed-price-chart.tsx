'use client';

import { getConfiguration } from '@/lib/api/config';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PriceHistoryPlot } from './price-history-plot';
import { formatExactPrice } from './price-history-format';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  chartTimeframes,
  getChartRanges,
  getChart,
  type ChartRange,
} from '@/lib/api/launches/market';
import { chartPoints, chartWindow } from '@/lib/api/launches/display';
import {
  launchKey,
  publicQueryOptions,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { PriceChart } from './price-chart';

export function IndexedPriceChart({
  address,
  network,
  ticker,
  pair,
  price,
  active = true,
  embedded = false,
}: {
  address: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
  price: string;
  active?: boolean;
  embedded?: boolean;
}) {
  const rules = getConfiguration().rules.chart;
  const supportedRanges = getChartRanges();
  const defaultRange = supportedRanges.find(range => range === rules.defaultLegacyRange) ?? supportedRanges[0];
  const [range, setRange] = useState<ChartRange>(defaultRange ?? '1D');
  const visible = usePageVisible() && active;
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [
      ...launchKey(network, address),
      'chart',
      range,
      chartTimeframes[range],
      { limit: rules.defaultLimit, window: range, to: 'server-now' },
    ],
    queryFn: ({ signal }) => getChart(address, network, range, signal),
    enabled: visible && supportedRanges.includes(range),
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, address), 'chart', range],
      });
  }, [client, address, network, range, visible]);
  let points: ReturnType<typeof chartPoints> = [],
    precisionError = '';
  try {
    if (query.data) points = chartPoints(query.data);
  } catch (error) {
    precisionError =
      error instanceof Error
        ? error.message
        : 'These prices cannot be plotted accurately.';
  }
  const timeDomain = query.data ? chartWindow(query.data) : undefined;
  const exactPrices = new Map(query.data?.items.map(candle => [
    Date.parse(candle.timestamp),
    formatExactPrice(candle.close ?? candle.latestPrice, query.data.priceScale),
  ]));
  const content = !supportedRanges.length ? <p role="status" className="p-4 text-small text-muted-foreground">Price history is not configured for the supported chart ranges.</p> : query.isPending ? (
    <Skeleton className={embedded ? 'h-full min-h-0 w-full' : 'h-60 w-full'} />
  ) : query.isError && !query.data ? (
    <Empty className={embedded ? 'h-full min-h-0 p-3' : undefined}>
      <EmptyHeader>
        <EmptyTitle>Could not load price history</EmptyTitle>
        <EmptyDescription>{query.error.message}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={() => void query.refetch()}>
        Retry
      </Button>
    </Empty>
  ) : precisionError || points.length === 0 ? (
    <Empty className={embedded ? 'h-full min-h-0 p-3' : 'min-h-60'}>
      <EmptyHeader>
        <EmptyTitle>
          {precisionError
            ? 'Price chart unavailable'
            : 'Price history not available yet'}
        </EmptyTitle>
        <EmptyDescription>
          {precisionError || 'Recorded prices will appear here when available.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <>
      <PriceHistoryPlot
        points={points.map(point => ({ ...point, exactPrice: exactPrices.get(point.time) ?? String(point.price) }))}
        timeDomain={timeDomain}
        ticker={ticker}
        pair={pair}
        embedded={embedded}
      />
    </>
  );
  return (
    <>
      <PriceChart
        embedded={embedded}
        ticker={ticker}
        price={price}
        quoteSymbol={pair}
        history={{
          range,
          onRangeChange: setRange,
          content: (
            <div
              className={
                embedded ? 'flex h-full min-h-0 flex-1 flex-col' : 'min-h-60'
              }
            >
              {content}
              {query.isError && query.data && (
                <p role="alert" className="text-small text-destructive">
                  Could not refresh price history.{' '}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void query.refetch()}
                  >
                    Retry
                  </Button>
                </p>
              )}
            </div>
          ),
        }}
      />
    </>
  );
}
