'use client';

import { cn } from '@/lib/utils';
import { FieldDescription, FieldLabel, Field } from '@/components/ui/field';
import { LaunchFieldError } from '../launch-motion';
import { FieldSurface, LaunchInput } from './field-controls';
import { formatSupply } from '../../lib/amount';
import { HelpTooltip } from './help-tooltip';
import { PresetChoices } from './preset-choices';
import { QuoteIcon } from './quote-icon';
import type { Preset } from './types';

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  hint,
  help,
  placeholder,
  error,
  presets,
  groupThousands = false,
  descriptionId,
  invalid = false,
  layout = 'default',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  help?: string;
  placeholder?: string;
  error?: string;
  presets?: Preset[];
  groupThousands?: boolean;
  descriptionId?: string;
  invalid?: boolean;
  layout?: 'default' | 'launch-plan';
}) {
  function changeValue(input: HTMLInputElement) {
    const nextValue = groupThousands
      ? input.value.replaceAll(',', '')
      : input.value;
    const digitsBeforeCaret = groupThousands
      ? input.value
          .slice(0, input.selectionStart ?? input.value.length)
          .replaceAll(',', '').length
      : 0;
    onChange(nextValue);
    if (!groupThousands) return;

    const formatted = formatSupply(nextValue);
    requestAnimationFrame(() => {
      if (document.activeElement !== input || input.value !== formatted) return;
      let caret = 0;
      let characters = 0;
      while (caret < formatted.length && characters < digitsBeforeCaret) {
        if (formatted[caret] !== ',') characters += 1;
        caret += 1;
      }
      input.setSelectionRange(caret, caret);
    });
  }

  return (
    <Field data-invalid={!!error || invalid}>
      <FieldSurface className={layout === 'launch-plan' ? 'py-3 studio-compact:py-2' : undefined}>
        <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1", layout === 'launch-plan' && 'gap-y-2')}>
          <div className="flex min-h-7 studio-compact:min-h-5 min-w-0 items-center gap-1">
            <FieldLabel
              htmlFor={id}
              className="min-w-0 text-small text-muted-foreground"
            >
              {label}
            </FieldLabel>
            {help && <HelpTooltip label={label}>{help}</HelpTooltip>}
          </div>
          {presets && (
            <PresetChoices
              label={label}
              value={value}
              options={presets}
              onChange={onChange}
              variant="inline"
              className={layout === 'launch-plan' ? '-mr-1 gap-1 [&>button]:rounded-md' : undefined}
            />
          )}
        </div>
        <div className={cn("mt-1 flex min-w-0 gap-2", layout === 'launch-plan' ? 'items-center' : 'items-end')}>
          <LaunchInput
            id={id}
            type="text"
            inputMode="decimal"
            value={groupThousands ? formatSupply(value) : value}
            onChange={(event) => changeValue(event.currentTarget)}
            placeholder={placeholder || '0'}
            aria-invalid={!!error || invalid}
            aria-describedby={
              [
                descriptionId,
                error ? `${id}-error` : hint ? `${id}-hint` : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn("flex-1 tabular-nums", layout === 'launch-plan' && 'h-10 text-2xl studio-compact:h-9')}
          />
          {unit && (
            <span className={cn("inline-flex shrink-0 items-center gap-2 text-lg font-semibold text-foreground sm:text-xl", layout !== 'launch-plan' && 'pb-1')}>
              {(unit === 'XLM' || unit === 'USDC') && (
                <QuoteIcon quote={unit} className="size-6 sm:size-7" />
              )}
              {unit}
            </span>
          )}
        </div>
      </FieldSurface>
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  );
}
