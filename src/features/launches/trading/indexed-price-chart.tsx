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
import { chartNumber, chartPoints, chartWindow } from '@/lib/api/launches/display';
import {
  launchKey,
  publicQueryOptions,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { ChartTimeframeSelector, PriceChart } from './price-chart';

export function IndexedPriceChart({
  slug,
  network,
  ticker,
  pair,
  price,
  active = true,
  embedded = false,
}: {
  slug: string;
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
  const [chartType, setChartType] = useState<'area' | 'candles'>('area');
  const visible = usePageVisible() && active;
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [
      ...launchKey(network, slug),
      'chart',
      range,
      chartTimeframes[range],
      { limit: rules.defaultLimit, window: range, to: 'server-now' },
    ],
    queryFn: ({ signal }) => getChart(slug, network, range, signal),
    enabled: visible && !!slug && supportedRanges.includes(range),
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: [...launchKey(network, slug), 'chart', range],
      });
  }, [client, slug, network, range, visible]);
  let points: ReturnType<typeof chartPoints> = [],
    precisionError = '';
  let candles = new Map<number, { open: number; high: number; low: number; close: number; exact: string }>();
  try {
    if (query.data) {
      points = chartPoints(query.data);
      const { priceScale } = query.data;
      candles = new Map(query.data.items.map(candle => [Date.parse(candle.timestamp), {
        open: chartNumber(candle.open, priceScale),
        high: chartNumber(candle.high, priceScale),
        low: chartNumber(candle.low, priceScale),
        close: chartNumber(candle.close ?? candle.latestPrice, priceScale),
        exact: `O ${formatExactPrice(candle.open, priceScale)} · H ${formatExactPrice(candle.high, priceScale)} · L ${formatExactPrice(candle.low, priceScale)} · C ${formatExactPrice(candle.close ?? candle.latestPrice, priceScale)}`,
      }]));
    }
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
        timeframeControl={<ChartTimeframeSelector range={range} onRangeChange={setRange} />}
        chartType={chartType}
        onChartTypeChange={setChartType}
        rangeKey={range}
        points={points.map(point => ({ ...point, candle: candles.get(point.time), exactPrice: exactPrices.get(point.time) ?? String(point.price) }))}
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
          inlineControls: !!points.length && !precisionError,
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
