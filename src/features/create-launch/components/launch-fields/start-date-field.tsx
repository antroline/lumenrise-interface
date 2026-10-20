'use client';

import { Info } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { launchStartError } from '../../lib/launch-validation';
import { DateTimePicker } from './date-time-picker';
import { FieldSurface } from './field-controls';

export function StartDateField({
  value,
  enabled,
  onChange,
  onEnabledChange,
  error,
}: {
  value: string;
  enabled: boolean;
  onChange: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  error?: string;
}) {
  return (
    <FieldSurface
      className={`min-w-0 ${!enabled ? 'bg-neutral-100 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-900' : ''}`}
    >
      <div className="flex min-h-7 min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <FieldLabel
            htmlFor="schedule-launch"
            className="text-small text-muted-foreground"
          >
            Schedule
          </FieldLabel>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label="About launch scheduling"
              className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <Info className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-sm leading-relaxed">
              Choose a future date and time in your local timezone. Otherwise,
              your launch starts after confirmation.
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          id="schedule-launch"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-controls="scheduled-launch-date"
          className="h-7 w-12 after:inset-x-0 [&>[data-slot=switch-thumb]]:size-6 [&>[data-slot=switch-thumb][data-checked]]:translate-x-[22px]"
        />
      </div>
      <div
        id="scheduled-launch-date"
        className={`min-w-0 ${!enabled ? '[&_button]:cursor-not-allowed [&_button]:opacity-100 [&_button_span]:text-neutral-300 [&_button_svg]:text-neutral-300 dark:[&_button_span]:text-neutral-600 dark:[&_button_svg]:text-neutral-600' : ''}`}
      >
        <DateTimePicker
          id="bonding-start"
          label="Choose date & time"
          triggerLabel="Start Date"
          value={value}
          onChange={onChange}
          disabled={!enabled}
          error={enabled ? error || launchStartError(value) : undefined}
          compact
          trailingCalendar
          showActions={false}
          embedded
        />
      </div>
    </FieldSurface>
  );
}
