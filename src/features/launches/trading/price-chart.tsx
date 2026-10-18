'use client';

import { useState, type ReactNode } from 'react';
import { LineChart } from '@/components/charts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import type { ChartTimeframe, PriceSeries } from '../data/trading';

const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', 'ALL'];

export function PriceChart({
  ticker,
  series,
  quoteSymbol = 'USD',
  history,
  embedded = false,
}: {
  ticker: string;
  embedded?: boolean;
  price: string;
  series?: Record<ChartTimeframe, PriceSeries>;
  quoteSymbol?: string;
  history?: {
    range: ChartTimeframe;
    onRangeChange: (range: ChartTimeframe) => void;
    content: ReactNode;
  };
}) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('3M');
  const selected = history?.range ?? timeframe;
  const current = series?.[selected];

  return (
    <section
      aria-label="Price analysis"
      className={
        embedded
          ? 'price-history flex h-full min-w-0 flex-col bg-transparent text-neutral-900 dark:text-neutral-50'
          : 'price-history flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-semibold">Price history</h2>
          <div className="flex flex-wrap items-baseline gap-2.5 text-small text-neutral-500 dark:text-neutral-400">
            <span>
              {ticker} / {quoteSymbol}
            </span>
            {current && (
              <span className="text-small text-ok">{current.change}</span>
            )}
          </div>
        </div>
        {(series || history) && (
          <ToggleGroup
            aria-label="Chart timeframe"
            value={[selected]}
            onValueChange={(values) => {
              const [next] = values;
              if (timeframes.includes(next as ChartTimeframe)) {
                if (history) history.onRangeChange(next as ChartTimeframe);
                else setTimeframe(next as ChartTimeframe);
              }
            }}
            className="flex-wrap data-[variant=default]:bg-neutral-100 dark:data-[variant=default]:bg-neutral-800"
          >
            {timeframes.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                disabled={!series && !history}
                className="min-h-8 px-2.5 text-meta text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 data-pressed:bg-white data-pressed:text-neutral-900 motion-reduce:transition-none dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 dark:data-pressed:bg-neutral-700 dark:data-pressed:text-white"
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <div
        className={
          embedded
            ? 'mt-4 flex min-h-0 min-w-0 flex-1 flex-col'
            : 'mt-4 min-w-0'
        }
      >
        {history ? (
          history.content
        ) : current ? (
          <LineChart
            data={current.data}
            height={240}
            min={current.min}
            max={current.max}
            yTicks={current.yTicks}
            xLabels={current.xLabels}
            formatTick={(value) => `$${value.toFixed(2)}`}
            label={`${ticker} price over ${timeframe}`}
          />
        ) : (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyTitle>Price history unavailable</EmptyTitle>
              <EmptyDescription>
                There is no connected historical price source for this preview.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </section>
  );
}
