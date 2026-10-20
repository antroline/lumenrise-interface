'use client';

import { Info } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { launchStartError } from '../../lib/launch-validation';
import { DateTimePicker } from './date-time-picker';

export function StartDateField({ value, enabled, onChange, onEnabledChange, error }: {
  value: string;
  enabled: boolean;
  onChange: (value: string) => void;
  onEnabledChange: (enabled: boolean) => void;
  error?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-7 min-w-0 items-center gap-5">
        <div className="flex min-w-0 items-center gap-1">
          <FieldLabel htmlFor="schedule-launch" className={!enabled ? 'opacity-50' : undefined}>Schedule</FieldLabel>
          <Tooltip>
            <TooltipTrigger type="button" aria-label="About launch scheduling" className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-foreground">
              <Info className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">Choose a future date and time in your local timezone. Otherwise, your launch starts after confirmation.</TooltipContent>
          </Tooltip>
        </div>
        <Switch id="schedule-launch" checked={enabled} onCheckedChange={onEnabledChange} aria-controls="scheduled-launch-date" />
      </div>
      <div id="scheduled-launch-date" className="min-w-0">
        <DateTimePicker id="bonding-start" label="Choose date & time" triggerLabel="Start Date" value={value} onChange={onChange} disabled={!enabled} error={enabled ? error || launchStartError(value) : undefined} compact trailingCalendar showActions={false} />
      </div>
    </div>
  );
}
