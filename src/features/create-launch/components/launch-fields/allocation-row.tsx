'use client';

import { FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isNumericInput } from '../../lib/amount';
import { AllocationSlider } from './allocation-slider';
import { HelpTooltip } from './help-tooltip';

export function AllocationRow({
  id,
  label,
  value,
  onChange,
  amount,
  help,
  swatch,
  invalid = false,
  descriptionId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Read-only token quantity for the current share. */
  amount: string;
  help?: string;
  /** Segment color shared with the allocation bar. */
  swatch: string;
  invalid?: boolean;
  descriptionId?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 studio-compact:py-1">
      <div className="flex min-w-0 flex-1 items-center gap-3 @lg/launch:max-w-56">
        <span
          aria-hidden="true"
          className={cn('size-2.5 shrink-0 rounded-full', swatch)}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <FieldLabel
              htmlFor={id}
              className="whitespace-nowrap text-ui font-medium text-foreground"
            >
              {label}
            </FieldLabel>
            {help && <HelpTooltip label={label}>{help}</HelpTooltip>}
          </div>
          <p className="mt-0.5 studio-compact:mt-0 break-all text-small tabular-nums text-muted-foreground">
            {amount}
          </p>
        </div>
      </div>
      <div className="order-3 w-full @lg/launch:order-2 @lg/launch:w-auto @lg/launch:min-w-28 @lg/launch:flex-1">
        <AllocationSlider
          label={label}
          value={value}
          onChange={onChange}
          fill={swatch}
          descriptionId={descriptionId}
        />
      </div>
      <div className="relative order-2 shrink-0 @lg/launch:order-3">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            if (isNumericInput(nextValue)) onChange(nextValue);
          }}
          placeholder="0"
          aria-invalid={invalid || undefined}
          aria-describedby={descriptionId}
          className="h-11 studio-compact:h-9 w-19 border-transparent bg-secondary/70 pr-7 text-right font-semibold tabular-nums @lg/launch:w-24"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ui text-muted-foreground"
        >
          %
        </span>
      </div>
    </div>
  );
}
