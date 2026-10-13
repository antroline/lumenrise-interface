'use client';
import { Info } from 'lucide-react';
import { TradeTooltip } from './trade-tooltip';
export function TradeHint({ label, help }: { label: string; help: string }) {
  return (
    <TradeTooltip content={help}>
      <button
        type="button"
        aria-label={label}
        className="flex w-fit cursor-help items-center gap-1.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60"
      >
        {label}
        <Info
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      </button>
    </TradeTooltip>
  );
}
