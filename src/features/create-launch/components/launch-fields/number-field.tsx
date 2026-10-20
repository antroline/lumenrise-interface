'use client';

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

  // Currency symbols read before the amount; measures such as %, months and tickers read after it.
  const prefix = unit === '$' ? unit : undefined;
  const suffix = prefix ? undefined : unit;

  return (
    <Field data-invalid={!!error || invalid} className="min-w-0">
      <FieldSurface>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-h-6 min-w-0 items-center gap-0.5">
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
              className="-mr-1.5"
            />
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          {prefix && (
            <span aria-hidden="true" className="shrink-0 text-[17px] font-semibold text-muted-foreground">
              {prefix}
            </span>
          )}
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
            className="flex-1 tabular-nums"
          />
          {suffix && (
            <span className="inline-flex max-w-[45%] shrink-0 items-center gap-1.5 truncate text-ui font-medium text-muted-foreground">
              {(suffix === 'XLM' || suffix === 'USDC') && (
                <QuoteIcon quote={suffix} className="size-5" />
              )}
              {suffix}
            </span>
          )}
        </div>
      </FieldSurface>
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
      {hint && !error && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  );
}
