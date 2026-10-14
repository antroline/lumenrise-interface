'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart } from '@/components/charts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { getChart, type ChartRange } from '@/lib/api/launches/market';
import { chartPoints } from '@/lib/api/launches/display';
import {
  launchKey,
  publicQueryOptions,
  usePageVisible,
} from '@/lib/api/launches/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { PriceChart } from './price-chart';

export function IndexedPriceChart({
  address,
  network,
  ticker,
  pair,
  price,
}: {
  address: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
  price: string;
}) {
  const [range, setRange] = useState<ChartRange>('1D');
  const chartContainer = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(680);
  useEffect(() => {
    const element = chartContainer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setChartWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = usePageVisible();
  const client = useQueryClient();
  const query = useQuery({
    ...publicQueryOptions,
    queryKey: [...launchKey(network, address), 'chart', range],
    queryFn: ({ signal }) => getChart(address, network, range, signal),
    enabled: visible,
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
    if (query.data) points = chartPoints(query.data, query.dataUpdatedAt);
  } catch (error) {
    precisionError =
      error instanceof Error
        ? error.message
        : 'These prices cannot be plotted accurately.';
  }
  const data = points.map((p) => p.price),
    min = Math.min(...data),
    max = Math.max(...data);
  const padding = Math.max((max - min) * 0.1, Math.abs(max) * 0.01, 0.0000001);
  const formatDate = (time: number) =>
    new Date(time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const content = query.isPending ? (
    <Skeleton className="h-60 w-full" />
  ) : query.isError && !query.data ? (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Could not load price history</EmptyTitle>
        <EmptyDescription>{query.error.message}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={() => void query.refetch()}>
        Retry
      </Button>
    </Empty>
  ) : precisionError || !points.length ? (
    <Empty className="min-h-60">
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
      <LineChart
        data={data}
        timestamps={points.map((p) => p.time)}
        interpolation="step"
        fill={false}
        className="[&_.stroke-foreground]:stroke-lime [&_line]:stroke-transparent [&_text]:fill-muted-foreground"
        width={chartWidth}
        axisWidth={90}
        height={240}
        min={min - padding}
        max={max + padding}
        yTicks={[min, (min + max) / 2, max].filter(
          (v, i, a) => a.indexOf(v) === i,
        )}
        xLabels={[
          formatDate(points[0].time),
          formatDate(points[points.length - 1].time),
        ]}
        formatTick={(v) =>
          v.toLocaleString('en-US', {
            maximumSignificantDigits: 8,
            notation:
              Math.abs(v) >= 1000
                ? 'compact'
                : Math.abs(v) > 0 && Math.abs(v) < 0.00001
                  ? 'scientific'
                  : 'standard',
          })
        }
        marker={false}
        label={`${ticker} observed contract prices in ${pair} over ${range}`}
      />
      <p className="mt-3 text-small text-muted-foreground">
        Observed contract prices · before fees · held between observations
      </p>
    </>
  );
  return (
    <>
      <PriceChart
        ticker={ticker}
        price={price}
        quoteSymbol={pair}
        history={{
          range,
          onRangeChange: setRange,
          content: (
            <div ref={chartContainer} className="min-h-60">
              {content}
            </div>
          ),
        }}
      />
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
    </>
  );
}
