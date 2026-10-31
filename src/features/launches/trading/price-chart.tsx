'use client';

import { candleTimeframes, type CandleTimeframe } from './candle-history';
import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ChartRange } from '@/lib/api/launches/market';
import { getConfiguration } from '@/lib/api/config';

export function ChartTimeframeSelector({ range, onRangeChange, timeframe, onTimeframeChange }: {
  range: ChartRange | null;
  onRangeChange: (range: ChartRange) => void;
  timeframe: CandleTimeframe;
  onTimeframeChange: (timeframe: CandleTimeframe) => void;
}) {
  const available: ChartRange[] = ['1D', '1W', '1M', '3M', 'ALL'];
  const intervals = candleTimeframes.filter(option => getConfiguration().rules.chart.timeframes.includes(option));
  const labels = { '1D': 'Last day', '1W': 'Last week', '1M': 'Last month', '3M': 'Last 3 months', ALL: 'All available history' };
  const itemClass = 'h-9 min-w-7 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-foreground! data-pressed:text-background! data-pressed:shadow-none motion-reduce:transition-none sm:h-8 sm:px-2 sm:text-xs';
  return (
    <div className="contents">
    <div className="mr-auto flex shrink-0 items-center max-sm:w-full">
    <ToggleGroup aria-label="Display range" value={range ? [range] : []} onValueChange={values => {
      const next = values[0];
      if (available.includes(next as ChartRange)) onRangeChange(next as ChartRange);
    }} className="h-9 max-w-full rounded-lg border border-border/60 bg-muted/50! p-0.5! max-sm:w-full [&_[data-slot=toggle-group-item]]:h-[30px] max-sm:[&_[data-slot=toggle-group-item]]:flex-1">
      {available.map(option => (
        <ToggleGroupItem key={option} value={option} aria-label={labels[option]} title={labels[option]} className={itemClass}>
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
    </div>
    <Select items={intervals.map(option => ({ value: option, label: option }))} value={timeframe} onValueChange={value => {
      const next = intervals.find(option => option === value);
      if (next) onTimeframeChange(next);
    }}>
      <SelectTrigger aria-label="Candle timeframe" size="sm" className="w-18 shrink-0 gap-1.5 border-border/60 bg-muted/50 px-2 text-foreground hover:bg-accent data-popup-open:bg-accent data-[size=sm]:h-9 data-[size=sm]:rounded-lg data-[size=sm]:text-[11px] max-sm:mr-auto sm:data-[size=sm]:text-xs [&_svg]:size-3.5"><span className="sr-only">Interval</span><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>
        {intervals.map(option => <SelectItem key={option} value={option} className="text-[11px] sm:text-xs">{option}{option === '1M' ? ' · Month' : option === '1m' ? ' · Minute' : ''}</SelectItem>)}
      </SelectGroup></SelectContent>
    </Select>
    </div>
  );
}

export function PriceChart({
  ticker,
  quoteSymbol = 'Pair token',
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
    controls?: ReactNode;
    dailyChange?: string | null;
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
        <div className="min-w-0">
        <p className="min-w-0 break-all text-base font-semibold tracking-tight">
          {ticker} <span className="mx-1 font-normal text-muted-foreground/60">/</span> <span className="font-medium text-muted-foreground">{quoteSymbol}</span>
        </p>
        <p className={history.dailyChange?.startsWith('+') ? 'text-xs text-ok' : history.dailyChange?.startsWith('-') ? 'text-xs text-bad' : 'text-xs text-muted-foreground'}>Daily {history.dailyChange ?? '—'}</p>
        </div>
        {history.controls}
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
