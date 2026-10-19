'use client';

import { useRef, useState } from 'react';
import type { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { isoToLocalDateTime } from '../../lib/launch-draft';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';
import { launchFieldSurfaceClassName } from './field-controls';

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  error,
  earliest,
  defaultLabel,
  compact = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  earliest?: string;
  defaultLabel?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const actionsRef = useRef<PopoverPrimitive.Root.Actions>(null);
  const selected = value ? new Date(value) : undefined;
  const local = isoToLocalDateTime(value);
  const time = local.split('T')[1] || '10:00';
  const earliestDay = earliest ? new Date(earliest) : new Date();
  earliestDay.setHours(0, 0, 0, 0);

  function chooseDay(day: Date | undefined) {
    if (!day) return;
    const [hours, minutes] = time.split(':').map(Number);
    onChange(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
      ).toISOString(),
    );
  }

  function chooseTime(next: string) {
    if (!selected || !next) return;
    const [hours, minutes] = next.split(':').map(Number);
    onChange(
      new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
        hours,
        minutes,
      ).toISOString(),
    );
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className={compact ? 'sr-only' : 'text-body'}>
        {label}
      </FieldLabel>
      <Popover open={open} actionsRef={actionsRef} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              className={cn(launchFieldSurfaceClassName, 'h-auto w-full justify-between text-left hover:bg-secondary aria-expanded:bg-secondary', compact ? 'min-h-12' : 'min-h-18')}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-3">
            <CalendarDays
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span
                className={cn(
                  'block whitespace-normal font-semibold leading-snug tabular-nums',
                  compact ? 'text-body' : 'text-title',
                  !selected && !defaultLabel && 'text-muted-foreground',
                )}
              >
                {selected
                  ? new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(selected)
                  : defaultLabel || 'Select a date'}
              </span>
              {!compact && <span className="mt-1 block text-ui font-normal text-muted-foreground">
                {selected
                  ? 'Custom date & time'
                  : defaultLabel
                    ? 'Default · click to change'
                    : 'Choose date & time'}
              </span>}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </PopoverTrigger>
        <PopoverContent className="translate-none! p-1 transition-opacity motion-reduce:transition-none">
          <PopoverTitle className="sr-only">{label}</PopoverTitle>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={chooseDay}
            disabled={{ before: earliestDay }}
            defaultMonth={selected || earliestDay}
          />
          <div className="flex items-end gap-3 border-t border-divider p-3">
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor={`${id}-time`} className="text-body">
                Local time
              </FieldLabel>
              <Input
                id={`${id}-time`}
                type="time"
                value={time}
                onChange={(event) => chooseTime(event.target.value)}
                disabled={!selected}
                className="mt-1"
              />
            </Field>
            <Button
              type="button"
              size="sm"
              onClick={() => actionsRef.current?.close()}
              disabled={!selected}
            >
              Done
            </Button>
          </div>
          <LaunchReveal show={!!defaultLabel && !!selected}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-2 ml-3"
              onClick={() => {
                onChange('');
                actionsRef.current?.close();
              }}
            >
              Use default: {defaultLabel}
            </Button>
          </LaunchReveal>
        </PopoverContent>
      </Popover>
      <LaunchFieldError id={`${id}-error`} className="text-small text-bad">
        {error}
      </LaunchFieldError>
    </Field>
  );
}
