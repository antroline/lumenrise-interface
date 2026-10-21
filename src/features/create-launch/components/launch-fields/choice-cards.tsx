'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Choice } from './types';

export function ChoiceCards<T extends string>({
  title,
  value,
  options,
  onChange,
  compact = false,
  description,
  icon: HeaderIcon,
}: {
  title: string;
  value: T;
  options: readonly [Choice<T>, ...Choice<T>[]];
  onChange: (value: T) => void;
  compact?: boolean;
  description?: string;
  icon?: LucideIcon;
}) {
  const selectedValue = value ?? options[0].value;
  return (
    <FieldSet className={compact ? 'gap-4 has-[>[data-slot=radio-group]]:gap-4' : undefined}>
      <FieldLegend className={compact ? 'mb-4 w-full' : undefined}>
        <span className="flex items-center gap-3">
          {HeaderIcon && <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-foreground"><HeaderIcon className="size-6" /></span>}
          <span className="min-w-0">
            <span className={compact ? 'block text-base font-semibold tracking-tight sm:text-lg' : undefined}>{title}</span>
            {description && <span className="mt-0.5 block text-sm font-normal leading-relaxed text-muted-foreground">{description}</span>}
          </span>
        </span>
      </FieldLegend>
      <RadioGroup
        value={selectedValue}
        onValueChange={(next) => {
          const choice = options.find((option) => option.value === next);
          if (choice && !choice.disabled) onChange(choice.value);
        }}
        className={compact ? 'grid auto-rows-fr gap-3 @3xl/launch:grid-cols-2' : 'grid gap-3 @md/launch:grid-cols-2'}
      >
        {options.map((option) => (
          <FieldLabel
            key={option.value}
            aria-disabled={option.disabled || undefined}
            className={cn(
              'h-full min-w-0 cursor-pointer border-2! shadow-none! transition-colors duration-150 has-[:focus-visible]:ring-ring! has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card',
              selectedValue === option.value
                ? 'border-emphasis! bg-accent!'
                : 'border-border! bg-card! hover:border-faint! hover:bg-muted!',
              !compact && option.disabled && 'cursor-not-allowed opacity-60',
              compact && 'border! motion-reduce:transition-none',
              compact && selectedValue === option.value && 'border-primary! bg-primary/5!',
              compact && option.disabled && 'cursor-default! border-border! bg-card! hover:border-border! hover:bg-card!',
            )}
          >
            <Field
              data-disabled={option.disabled || undefined}
              orientation="horizontal"
              className={cn('min-h-24 items-start gap-2 @md/launch:p-3! short:min-h-20 short:p-3!', compact && 'min-h-24 items-center! gap-3 p-3! @3xl/launch:min-h-26 @3xl/launch:gap-4 @3xl/launch:p-4! short:min-h-24')}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-150',
                  selectedValue === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                  compact && 'size-10 rounded-xl @3xl/launch:size-14 motion-reduce:transition-none',
                  compact && option.emphasis && 'bg-foreground text-background',
                )}
                aria-hidden="true"
              >
                <option.icon className={compact ? 'size-6 @3xl/launch:size-7' : 'size-4'} />
              </span>
              <FieldContent className="min-w-0">
                <span className={cn('flex items-start justify-between gap-2', compact && 'flex-wrap items-center gap-y-1')}>
                  <strong
                    className={cn(
                      'text-ui font-semibold',
                      compact && 'tracking-tight @3xl/launch:text-base',
                      selectedValue === option.value
                        ? 'text-accent-foreground'
                        : 'text-foreground',
                    )}
                  >
                    {option.title}
                  </strong>
                  {compact && option.disabled && <Badge variant="soft" size="sm">Coming Soon</Badge>}
                </span>
                <span
                  className={cn(
                    'mt-1 text-small font-normal',
                    selectedValue === option.value
                      ? 'text-accent-foreground/70'
                      : 'text-muted-foreground',
                    compact && 'mt-1 leading-relaxed @3xl/launch:text-sm',
                  )}
                >
                  {option.detail}
                </span>
              </FieldContent>
              <RadioGroupItem
                disabled={option.disabled}
                value={option.value}
                aria-label={option.title}
                className={cn('mt-0.5 focus-visible:ring-ring data-checked:border-emphasis data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]]:bg-primary', compact && 'mt-0 size-5 shrink-0 disabled:opacity-100 data-checked:border-foreground data-checked:bg-primary [&_[data-slot=radio-group-indicator]]:bg-foreground')}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
