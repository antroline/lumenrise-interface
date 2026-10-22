'use client';

import { getChartRanges } from '@/lib/api/launches/market';
import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ChartRange } from '@/lib/api/launches/market';

export function PriceChart({
  ticker,
  quoteSymbol = 'USD',
  history,
  embedded = false,
}: {
  ticker: string;
  embedded?: boolean;
  price: string;
  quoteSymbol?: string;
  history: {
    range: ChartRange;
    onRangeChange: (range: ChartRange) => void;
    content: ReactNode;
  };
}) {
  const available = getChartRanges();
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
          </div>
        </div>
        <ToggleGroup
          aria-label="Chart timeframe"
          value={[history.range]}
          onValueChange={(values) => {
            const [next] = values;
            if (available.includes(next as ChartRange)) {
              history.onRangeChange(next as ChartRange);
            }
          }}
          className="flex-wrap data-[variant=default]:bg-neutral-100 dark:data-[variant=default]:bg-neutral-800"
        >
          {available.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="min-h-8 px-2.5 text-meta text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 data-pressed:bg-white data-pressed:text-neutral-900 motion-reduce:transition-none dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 dark:data-pressed:bg-neutral-700 dark:data-pressed:text-white"
            >
              {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div
        className={
          embedded
            ? 'mt-4 flex min-h-0 min-w-0 flex-1 flex-col'
            : 'mt-4 min-w-0'
        }
      >
        {history.content}
      </div>
    </section>
  );
}
