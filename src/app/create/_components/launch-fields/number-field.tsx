'use client';

import { FieldDescription, FieldLabel, Field } from '@/components/ui/field';
import { LaunchFieldError } from '../launch-motion';
import { Input } from '@/components/ui/input';
import { formatSupply } from '../../_launch/amount';
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
      <div className="rounded-xl border border-border bg-surface dark:bg-muted px-4 py-3.5 transition-[border-color,box-shadow] duration-200 focus-within:border-foreground focus-within:ring-3 focus-within:ring-lime/40">
        <div className="flex min-h-7 min-w-0 items-center gap-1">
          <FieldLabel
            htmlFor={id}
            className="min-w-0 text-small text-muted-foreground"
          >
            {label}
          </FieldLabel>
          {help && <HelpTooltip label={label}>{help}</HelpTooltip>}
        </div>
        <div className="mt-1 flex min-w-0 items-end gap-2">
          <Input
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
            className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-[23px] font-semibold tracking-[-0.025em] tabular-nums focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 sm:text-[26px]"
          />
          {unit && (
            <span className="inline-flex shrink-0 items-center gap-1.5 pb-1.5 text-small font-semibold text-muted-foreground">
              {(unit === 'XLM' || unit === 'USDC') && (
                <QuoteIcon quote={unit} className="size-5" />
              )}
              {unit}
            </span>
          )}
        </div>
      </div>
      {presets && (
        <PresetChoices
          label={label}
          value={value}
          options={presets}
          onChange={onChange}
        />
      )}
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
  );
}
