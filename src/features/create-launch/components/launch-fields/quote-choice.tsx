'use client';

import { Check } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { QuoteToken } from '../../lib/launch-draft';
import { QuoteIcon } from './quote-icon';

export function QuoteChoice({
  value,
  onChange,
  highlightSelection = false,
  usdcOnly = false,
}: {
  value: QuoteToken;
  onChange: (value: QuoteToken) => void;
  highlightSelection?: boolean;
  usdcOnly?: boolean;
}) {
  return (
    <Field>
      <FieldLabel>What will buyers pay with?</FieldLabel>
      <ToggleGroup
        id="launch-quote"
        value={[value]}
        onValueChange={(values) => {
          const choice = values[0];
          if (choice === 'USDC' || (choice === 'XLM' && !usdcOnly)) onChange(choice);
        }}
        aria-label="Payment asset"
        variant="chip"
        className="grid w-full grid-cols-2 gap-3"
      >
        {(['XLM', 'USDC'] as const).map((quote) => (
          <ToggleGroupItem
            key={quote}
            value={quote}
            disabled={usdcOnly && quote === 'XLM'}
            aria-label={quote}
            className={cn(
              'relative h-auto min-h-15 studio-compact:min-h-12 min-w-0 flex-col items-stretch rounded-xl border-border bg-card px-4 py-3 studio-compact:py-2 text-left data-pressed:border-foreground data-pressed:bg-muted data-pressed:text-foreground ',
              highlightSelection && 'transition-[border-color,background-color,box-shadow] duration-200 data-pressed:ring-3 data-pressed:ring-lime/40 focus-visible:ring-lime/40',
            )}
          >
            <span className="flex w-full items-center gap-2.5">
              <QuoteIcon quote={quote} />
              <span className="text-[17px] font-semibold">{quote}</span>
              <span
                className={cn(
                  'ml-auto grid size-5 place-items-center rounded-full transition-opacity',
                  highlightSelection ? 'bg-ink text-lime' : 'bg-foreground text-background',
                  value === quote ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden="true"
              >
                <Check className="size-3.5" />
              </span>
            </span>
            <span className="mt-1.5 text-small font-normal whitespace-normal text-muted-foreground">
              {quote === 'XLM' ? usdcOnly ? 'Unavailable until USD conversion is connected' : 'Stellar native asset' : 'USD stablecoin'}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
