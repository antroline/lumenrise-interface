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
              'h-full min-w-0 cursor-pointer',
              selectedValue === option.value &&
                'border-foreground! bg-muted! shadow-none!',
            )}
          >
            <Field
              orientation="horizontal"
              className="min-h-24 items-start gap-3"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground"
                aria-hidden="true"
              >
                <option.icon className="size-4" />
              </span>
              <FieldContent>
                <strong className="text-ui font-semibold text-foreground">
                  {option.title}
                </strong>
                <span className="mt-1 text-small font-normal text-muted-foreground">
                  {option.detail}
                </span>
              </FieldContent>
              <RadioGroupItem
                value={option.value}
                aria-label={option.title}
                className="mt-0.5"
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
