'use client';

import { getChartRanges } from '@/lib/api/launches/market';
import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ChartRange } from '@/lib/api/launches/market';

export function ChartTimeframeSelector({ range, onRangeChange }: {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}) {
  const available = getChartRanges();
  return (
    <ToggleGroup aria-label="Chart timeframe" value={[range]} onValueChange={values => {
      const next = values[0];
      if (available.includes(next as ChartRange)) onRangeChange(next as ChartRange);
    }} className="max-w-full rounded-lg">
      {available.map(option => (
        <ToggleGroupItem key={option} value={option} className="h-9 min-w-8 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm motion-reduce:transition-none sm:h-8">
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

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
    inlineControls?: boolean;
  };
}) {
  return (
    <section
      aria-label="Price analysis"
      className={
        embedded
          ? 'price-history flex h-full min-w-0 flex-col bg-transparent text-foreground'
          : 'price-history flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 text-foreground sm:p-5'
      }
    >
      {!history.inlineControls && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-1">
        <p className="min-w-0 break-all text-base font-semibold tracking-tight">
          {ticker} <span className="mx-1 font-normal text-muted-foreground/60">/</span> <span className="font-medium text-muted-foreground">{quoteSymbol}</span>
        </p>
        {!history.inlineControls && <ChartTimeframeSelector range={history.range} onRangeChange={history.onRangeChange} />}
      </div>}
      <div
        className={
          embedded
            ? 'flex min-h-0 min-w-0 flex-1 flex-col'
            : 'min-w-0'
        }
      >
        {history.content}
      </div>
    </section>
  );
}
