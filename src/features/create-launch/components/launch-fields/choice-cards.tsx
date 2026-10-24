'use client';

import { LockKeyhole, type LucideIcon } from 'lucide-react';
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
    <FieldSet className={compact ? 'min-w-0 gap-0 has-[>[data-slot=radio-group]]:gap-0' : undefined}>
      <FieldLegend className={compact ? 'mb-4 w-full' : undefined}>
        <span className="flex items-start gap-3">
          {HeaderIcon && <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground"><HeaderIcon className="size-5" /></span>}
          <span className="min-w-0">
            <span className={compact ? 'block text-base font-semibold leading-6 tracking-tight' : undefined}>{title}</span>
            {description && <span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{description}</span>}
          </span>
        </span>
      </FieldLegend>
      <RadioGroup
        value={selectedValue}
        onValueChange={(next) => {
          const choice = options.find((option) => option.value === next);
          if (choice && !choice.disabled) onChange(choice.value);
        }}
        className={compact ? 'grid gap-3 @min-[620px]/launch:auto-rows-fr @min-[620px]/launch:grid-cols-2' : 'grid gap-3 @md/launch:grid-cols-2'}
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
              compact && !option.disabled && selectedValue === option.value && 'border-primary! bg-primary/5!',
              compact && option.disabled && 'cursor-not-allowed! border-dashed! border-border! bg-secondary/60! hover:border-border! hover:bg-secondary/60! dark:bg-secondary/40! dark:hover:bg-secondary/40!',
            )}
          >
            <Field
              data-disabled={option.disabled || undefined}
              orientation="horizontal"
              className={cn('min-h-24 items-start gap-2 @md/launch:p-3! short:min-h-20 short:p-3!', compact && 'min-h-28 items-start! gap-3 p-4! @md/launch:p-4! short:min-h-28 short:p-4!')}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-150',
                  selectedValue === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                  compact && 'size-9 rounded-lg motion-reduce:transition-none',
                  compact && option.emphasis && !option.disabled && 'bg-foreground text-background',
                  compact && option.disabled && 'bg-background/70 text-muted-foreground/60 dark:bg-background/40',
                )}
                aria-hidden="true"
              >
                <option.icon className={compact ? 'size-5' : 'size-4'} />
              </span>
              <FieldContent className={cn("min-w-0", compact && "gap-1")}>
                <span className="flex items-start justify-between gap-2">
                  <strong
                    className={cn(
                      'text-ui font-semibold',
                      compact && 'text-sm leading-5 tracking-normal',
                      selectedValue === option.value
                        ? 'text-accent-foreground'
                        : 'text-foreground',
                      compact && option.disabled && 'text-muted-foreground',
                    )}
                  >
                    {option.title}
                  </strong>
                </span>
                <span
                  className={cn(
                    'mt-1 text-small font-normal',
                    selectedValue === option.value
                      ? 'text-accent-foreground/70'
                      : 'text-muted-foreground',
                    compact && 'mt-0 text-sm leading-5',
                  )}
                >
                  {option.detail}
                </span>
                {compact && option.disabled && <Badge className="mt-2 self-start gap-1.5 border-border bg-background/70 text-muted-foreground dark:bg-background/40" size="sm"><LockKeyhole aria-hidden="true" />Coming Soon</Badge>}
              </FieldContent>
              <RadioGroupItem
                disabled={option.disabled}
                value={option.value}
                aria-label={option.title}
                className={cn('mt-0.5 focus-visible:ring-ring data-checked:border-emphasis data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]]:bg-primary', compact && 'mt-0.5 size-4.5 shrink-0 data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:bg-background data-disabled:opacity-40 data-checked:border-foreground data-checked:bg-primary [&_[data-slot=radio-group-indicator]]:bg-foreground')}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
