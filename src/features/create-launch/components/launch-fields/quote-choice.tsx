'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuoteToken } from '../../lib/launch-draft';
import { cn } from '@/lib/utils';
import { fieldSurfaceClassName as launchFieldSurfaceClassName } from '@/components/form-controls';
import { QuoteIcon } from './quote-icon';

export function QuoteChoice({
  value,
  onChange,
  usdcOnly = false,
}: {
  value: QuoteToken;
  onChange: (value: QuoteToken) => void;
  usdcOnly?: boolean;
}) {
  return (
    <Field className="min-w-0 gap-2">
      <FieldLabel htmlFor="launch-quote" className="sr-only">
        Payment Asset
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(choice) => {
          if (choice === 'USDC' || (choice === 'XLM' && !usdcOnly))
            onChange(choice);
        }}
      >
        <SelectTrigger
          id="launch-quote"
          className={cn(
            launchFieldSurfaceClassName,
            'h-auto! w-full text-foreground hover:border-transparent focus-visible:ring-0',
          )}
          aria-label="Payment Asset"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-h-6 items-center text-small font-medium text-muted-foreground">
              Payment Asset
            </span>
            <SelectValue>
              <span className="flex h-8 min-w-0 items-center gap-2 text-[17px] mt-1">
                <QuoteIcon quote={value} />
                <span className="font-semibold">{value}</span>
              </span>
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {(['USDC', 'XLM'] as const).map((quote) => (
              <SelectItem
                key={quote}
                value={quote}
                disabled={usdcOnly && quote === 'XLM'}
                className="min-h-14"
                label={quote}
              >
                <QuoteIcon quote={quote} />
                <span className="flex min-w-0 flex-col whitespace-normal">
                  <span className="font-medium">{quote}</span>
                  <span className="text-small text-muted-foreground">
                    {quote === 'USDC'
                      ? 'USD stablecoin'
                      : 'Stellar native asset'}
                  </span>
                  {quote === 'XLM' && usdcOnly && (
                    <span className="text-small text-muted-foreground">
                      Unavailable until USD conversion is connected
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
