'use client';

import {
  Field,
  FieldContent,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { Choice } from './types';

export function ChoiceCards<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: readonly [Choice<T>, ...Choice<T>[]];
  onChange: (value: T) => void;
}) {
  const selectedValue = value ?? options[0].value;
  return (
    <FieldSet>
      <FieldLegend>{title}</FieldLegend>
      <RadioGroup
        value={selectedValue}
        onValueChange={(next) => {
          const choice = options.find((option) => option.value === next);
          if (choice) onChange(choice.value);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {options.map((option) => (
          <FieldLabel
            key={option.value}
            className={cn(
              'h-full min-w-0 cursor-pointer border-2! shadow-none! transition-colors duration-150 has-[:focus-visible]:ring-ring! has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card',
              selectedValue === option.value
                ? 'border-emphasis! bg-accent!'
                : 'border-border! bg-card! hover:border-faint! hover:bg-muted!',
            )}
          >
            <Field
              orientation="horizontal"
              className="min-h-24 items-start gap-3"
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-150',
                  selectedValue === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-hidden="true"
              >
                <option.icon className="size-4" />
              </span>
              <FieldContent>
                <strong
                  className={cn(
                    'text-ui font-semibold',
                    selectedValue === option.value
                      ? 'text-accent-foreground'
                      : 'text-foreground',
                  )}
                >
                  {option.title}
                </strong>
                <span
                  className={cn(
                    'mt-1 text-small font-normal',
                    selectedValue === option.value
                      ? 'text-accent-foreground/70'
                      : 'text-muted-foreground',
                  )}
                >
                  {option.detail}
                </span>
              </FieldContent>
              <RadioGroupItem
                value={option.value}
                aria-label={option.title}
                className="mt-0.5 focus-visible:ring-ring data-checked:border-emphasis data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]]:bg-primary"
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
