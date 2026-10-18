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

  return (
    <Field data-invalid={!!error || invalid}>
      <FieldSurface>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
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
            />
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-end gap-2">
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
          {unit && (
            <span className="inline-flex shrink-0 items-center gap-2 pb-1 text-lg font-semibold text-foreground sm:text-xl">
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
