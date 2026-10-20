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
  triggerLabel,
  compact = false,
  showActions = true,
  trailingCalendar = false,
  disabled = false,
  embedded = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  earliest?: string;
  defaultLabel?: string;
  triggerLabel?: string;
  compact?: boolean;
  showActions?: boolean;
  trailingCalendar?: boolean;
  disabled?: boolean;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const actionsRef = useRef<PopoverPrimitive.Root.Actions>(null);
  const selected =
    value && Number.isFinite(Date.parse(value)) ? new Date(value) : undefined;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id} className={compact ? 'sr-only' : 'text-body'}>
        {label}
      </FieldLabel>
      <Popover
        open={open && !disabled}
        actionsRef={actionsRef}
        onOpenChange={setOpen}
      >
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? id + '-error' : undefined}
              className={cn(
                launchFieldSurfaceClassName,
                'h-auto w-full justify-between text-left',
                compact
                  ? trailingCalendar
                    ? 'min-h-14'
                    : 'min-h-12'
                  : 'min-h-18',
                embedded &&
                  'h-8! min-h-8 rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-0 disabled:bg-transparent',
              )}
            />
          }
        >
          {(!trailingCalendar || embedded) && (
            <CalendarDays
              aria-hidden="true"
              className={embedded ? 'size-5 text-muted-foreground' : undefined}
            />
          )}
          <span
            className={cn(
              'min-w-0 flex-1 whitespace-normal tabular-nums',
              trailingCalendar &&
                !selected &&
                'text-base font-normal text-muted-foreground',
              embedded && 'text-[17px] font-medium',
            )}
          >
            {selected
              ? new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(selected)
              : triggerLabel || defaultLabel || 'Select a date'}
          </span>
          {trailingCalendar ? (
            !embedded && (
              <CalendarDays
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
            )
          ) : (
            <ChevronDown aria-hidden="true" />
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[min(calc(100dvh-2rem),var(--available-height))] overflow-y-auto overscroll-contain p-4">
          <PopoverTitle className="sr-only">{label}</PopoverTitle>
          <DateTimeFields
            id={id}
            value={value}
            onChange={onChange}
            earliest={earliest}
            error={error}
            errorId={id + '-error'}
          />
          {showActions && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => actionsRef.current?.close()}
                disabled={!selected}
              >
                Done
              </Button>
            </div>
          )}
          <LaunchReveal show={showActions && !!defaultLabel && !!selected}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
      <LaunchFieldError id={id + '-error'} className="text-small text-bad">
        {error}
      </LaunchFieldError>
    </Field>
  );
}

/** Shared calendar and local-time conversion for the launch date pickers. */
function DateTimeFields({
  id,
  value,
  onChange,
  earliest,
  error,
  errorId,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  earliest?: string;
  error?: string;
  errorId?: string;
}) {
  const parsed = value ? new Date(value) : undefined;
  const selected =
    parsed && Number.isFinite(parsed.getTime()) ? parsed : undefined;
  const local = selected ? isoToLocalDateTime(value) : '';
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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="min-w-0">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={chooseDay}
        disabled={{ before: earliestDay }}
        defaultMonth={selected || earliestDay}
        className="w-full px-0"
        classNames={{
          weekdays: 'grid grid-cols-7',
          week: 'grid grid-cols-7',
          weekday: 'grid h-11 place-items-center text-xs text-muted-foreground',
          day: 'h-11 min-w-0 p-0 text-center text-sm [&[data-selected=true]>button]:bg-foreground [&[data-selected=true]>button]:text-background',
          day_button:
            'grid h-11 w-full place-items-center rounded-lg text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
          nav: 'absolute inset-x-0 top-0 flex h-11 items-center justify-between',
          button_previous:
            'grid size-11 place-items-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60',
          button_next:
            'grid size-11 place-items-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60',
        }}
      />
      <Field
        data-invalid={!!error}
        className="gap-2 border-t border-divider pt-3"
      >
        <FieldLabel htmlFor={id + '-time'}>Local time · {timezone}</FieldLabel>
        <Input
          id={id + '-time'}
          type="time"
          value={time}
          onInput={(event) => chooseTime(event.currentTarget.value)}
          disabled={!selected}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 text-base"
        />
      </Field>
    </div>
  );
}
