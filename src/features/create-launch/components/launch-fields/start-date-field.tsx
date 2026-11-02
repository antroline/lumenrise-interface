'use client';

import { Info } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { launchStartError } from '../../lib/launch-validation';
import { DateTimePicker } from './date-time-picker';
import { LaunchReveal } from '../launch-motion';

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
    <Field className="min-w-0 gap-1">
      <div className="flex min-h-9 min-w-0 items-center gap-4">
        <div className="flex min-w-0 items-center gap-1">
          <FieldLabel
            htmlFor="schedule-launch"
            className="cursor-pointer text-sm leading-5 font-medium text-foreground"
          >
            Scheduled
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
          aria-controls={enabled ? 'scheduled-launch-date' : undefined}
          className="after:-inset-y-3"
        />
      </div>
      <LaunchReveal
        show={enabled}
        className="min-w-0"
      >
        <div id="scheduled-launch-date">
          <DateTimePicker
            id="bonding-start"
            label="Choose date & time"
            triggerLabel="Select time"
            value={value}
            onChange={onChange}
            disabled={!enabled}
            error={enabled ? error || launchStartError(value) : undefined}
            compact
            trailingCalendar
            showActions={false}
          />
        </div>
      </LaunchReveal>
    </Field>
  );
}
