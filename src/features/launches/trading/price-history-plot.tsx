'use client';

import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, useChartWidth } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatPriceAxis, formatPriceTime, priceDomain } from './price-history-format';

export type PriceHistoryPoint = { time: number; price: number; exactPrice: string };

function PriceHistoryAxes({ start, end, domain }: {
  start: number;
  end: number;
  domain: [number, number];
}) {
  const width = useChartWidth();
  const compact = width !== undefined && width < 480;
  const intraday = end - start <= 2 * 86_400_000;
  const formatTick = (value: number) => formatPriceAxis(value, compact);
  const axisWidth = Math.min(
    compact ? 88 : 180,
    Math.max(
      compact ? 64 : 88,
      ...domain.map(value => formatTick(value).length * (compact ? 6 : 7) + (compact ? 12 : 24)),
    ),
  );

  return (
    <>
      <XAxis
        dataKey="time"
        type="number"
        scale="time"
        domain={[start, end]}
        allowDataOverflow
        tickFormatter={value => formatPriceTime(Number(value), intraday)}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        tickCount={compact ? 3 : 5}
        interval="preserveStartEnd"
        minTickGap={compact ? 24 : 60}
        tickMargin={12}
        height={32}
      />
      <YAxis
        orientation="right"
        domain={domain}
        allowDataOverflow
        tickFormatter={formatTick}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        tickMargin={compact ? 6 : 12}
        width={axisWidth}
        tickCount={compact ? 3 : 4}
      />
    </>
  );
}

export function PriceHistoryPlot({ points, timeDomain, ticker, pair, embedded = false }: {
  points: PriceHistoryPoint[];
  timeDomain?: [number, number];
  ticker: string;
  pair: string;
  embedded?: boolean;
}) {
  const gradientId = `price-area-${useId().replace(/[^\w-]/g, '')}`;
  const domain = priceDomain(points.map(point => point.price));
  const start = timeDomain?.[0] ?? points[0].time;
  const end = timeDomain?.[1] ?? points[points.length - 1].time;

  return (
    <ChartContainer
      config={{ price: { label: `${ticker} / ${pair}` } }}
      aria-label={`${ticker} recorded price history in ${pair}. Times in UTC.`}
      className={`min-w-0 w-full aspect-auto tabular-nums [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-neutral-400 [&_.recharts-surface:focus-visible]:outline-offset-2 ${embedded ? 'h-full min-h-48 flex-1' : 'h-60'}`}
    >
      <AreaChart
        data={points}
        margin={{ top: 12, right: 8, bottom: 4, left: 8 }}
        accessibilityLayer
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-price-area)" className="[stop-opacity:0.12] dark:[stop-opacity:0.1]" />
            <stop offset="50%" stopColor="var(--color-price-area)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--color-price-area)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <PriceHistoryAxes start={start} end={end} domain={domain} />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '3 4', strokeOpacity: 0.4 }}
          content={({ active, label }) => {
            // Look up the actual observation rather than showing an interpolated value.
            const point = points.find(point => point.time === Number(label));
            if (!active || !point) return null;
            return (
              <div className="max-w-64 rounded-lg bg-neutral-900 px-3 py-2.5 text-xs text-white dark:bg-neutral-800 dark:text-neutral-50">
                <p className="text-neutral-300 dark:text-neutral-400">
                  {new Date(point.time).toLocaleString('en-US', {
                    timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                  })} UTC
                </p>
                <p className="mt-1 break-all font-medium tabular-nums">{point.exactPrice} {pair}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotoneX"
          dataKey="price"
          baseValue={domain[0]}
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${gradientId})`}
          fillOpacity={1}
          dot={points.length === 1 ? { r: 3.5, fill: 'var(--foreground)', stroke: 'var(--card)', strokeWidth: 2 } : false}
          activeDot={{ r: 3.5, fill: 'var(--foreground)', stroke: 'var(--card)', strokeWidth: 2 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
