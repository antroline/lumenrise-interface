'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { QuoteToken } from '../../lib/launch-draft';
import { cn } from '@/lib/utils';
import { launchFieldSurfaceClassName } from './field-controls';
import { QuoteIcon } from './quote-icon';

export function QuoteChoice({ value, onChange, usdcOnly = false }: {
  value: QuoteToken;
  onChange: (value: QuoteToken) => void;
  usdcOnly?: boolean;
}) {
  return (
    <Field className="min-w-0 gap-2">
      <FieldLabel htmlFor="launch-quote" className="min-h-7 items-center">Payment Asset</FieldLabel>
      <Select value={value} onValueChange={(choice) => {
        if (choice === 'USDC' || (choice === 'XLM' && !usdcOnly)) onChange(choice);
      }}>
        <SelectTrigger id="launch-quote" className={cn(launchFieldSurfaceClassName, 'h-auto! min-h-14 w-full hover:border-transparent focus-visible:border-foreground/20 focus-visible:ring-lime/40')} aria-label="Payment Asset">
          <SelectValue>
            <span className="flex min-w-0 items-center gap-2.5">
              <QuoteIcon quote={value} />
              <span className="font-semibold">{value}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {(['USDC', 'XLM'] as const).map((quote) => (
              <SelectItem key={quote} value={quote} disabled={usdcOnly && quote === 'XLM'} className="min-h-14" label={quote}>
                <QuoteIcon quote={quote} />
                <span className="flex min-w-0 flex-col whitespace-normal">
                  <span className="font-medium">{quote}</span>
                  <span className="text-small text-muted-foreground">{quote === 'USDC' ? 'USD stablecoin' : 'Stellar native asset'}</span>
                  {quote === 'XLM' && usdcOnly && <span className="text-small text-muted-foreground">Unavailable until USD conversion is connected</span>}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
