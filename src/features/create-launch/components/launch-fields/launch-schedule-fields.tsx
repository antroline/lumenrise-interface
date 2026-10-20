'use client';

import { useRef } from 'react';
import { CalendarDays, Zap } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  launchDurationLabel,
  launchDurationOptions,
  type LaunchDurationDays,
} from '../../lib/launch-draft';
import type { FieldErrors } from '../../lib/launch-validation';
import { DateTimePicker } from './date-time-picker';
import { HelpTooltip } from './help-tooltip';
import { PresetChoices } from './preset-choices';

export function LaunchScheduleFields({
  method,
  startsAt,
  endsAt,
  durationDays,
  onChange,
  errors,
}: {
  method: 'bonding' | 'fixed' | 'auction';
  startsAt: string;
  endsAt: string;
  durationDays: LaunchDurationDays;
  onChange: (patch: {
    startsAt?: string;
    endsAt?: string;
    durationDays?: LaunchDurationDays;
  }) => void;
  errors: FieldErrors;
}) {
  const scheduledStart = useRef(startsAt);

  if (method === 'bonding')
    return (
      <FieldSet className="gap-2">
        <FieldLegend className="mb-0 text-sm font-medium">
          Start date
        </FieldLegend>
        <ToggleGroup
          aria-label="Start mode"
          aria-describedby="bonding-start-help"
          value={[startsAt ? 'schedule' : 'immediately']}
          onValueChange={(values) => {
            if (values[0] === 'immediately') {
              scheduledStart.current = startsAt;
              onChange({ startsAt: '' });
            } else if (values[0] === 'schedule') {
              // A concrete future value keeps the existing date validation authoritative.
              const previous = scheduledStart.current;
              onChange({
                startsAt:
                  previous && Date.parse(previous) > Date.now()
                    ? previous
                    : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              });
            }
          }}
          className="grid w-full grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-1"
        >
          <ToggleGroupItem
            value="immediately"
            className="h-11 gap-2 rounded-md text-body"
          >
            <Zap aria-hidden="true" /> Immediately
          </ToggleGroupItem>
          <ToggleGroupItem
            value="schedule"
            className="h-11 gap-2 rounded-md text-body"
          >
            <CalendarDays aria-hidden="true" /> Schedule
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription id="bonding-start-help" className="text-small">
          {startsAt
            ? 'Starts at the selected date and time, shown in your local time zone.'
            : 'Starts as soon as your launch is confirmed.'}
        </FieldDescription>
        {startsAt && (
          <DateTimePicker
            id="bonding-start"
            label="Scheduled start"
            value={startsAt}
            onChange={(value) => {
              scheduledStart.current = value;
              onChange({ startsAt: value });
            }}
            error={errors['bonding-start']}
            compact
          />
        )}
      </FieldSet>
    );
  return (
    <FieldGroup className="gap-4">
      <div className="flex flex-col gap-1.5"></div>
      <div className="grid gap-4 @md/launch:grid-cols-2">
        <DateTimePicker
          id={`${method}-start`}
          label="Start"
          value={startsAt}
          onChange={(value) => onChange({ startsAt: value })}
          error={errors[`${method}-start`]}
          defaultLabel="Immediately"
        />
        <DateTimePicker
          id={`${method}-end`}
          label="End"
          value={endsAt}
          onChange={(value) => onChange({ endsAt: value })}
          earliest={startsAt}
          error={errors[`${method}-end`]}
          defaultLabel={launchDurationLabel(durationDays)}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1">
          <p className="text-body font-medium">Duration</p>
          <HelpTooltip label="Launch duration">
            The window ends this long after it starts. Month choices are 30 and
            60 days.
          </HelpTooltip>
        </div>
        <PresetChoices
          className="grid grid-cols-2 @sm/launch:grid-cols-4 [&>button]:min-h-10 [&>button]:rounded-lg [&>button]:text-body"
          label="Launch duration"
          value={endsAt ? '' : durationDays}
          options={launchDurationOptions}
          onChange={(days) => {
            const selected = launchDurationOptions.find(
              (option) => option.value === days,
            );
            if (selected)
              onChange({ durationDays: selected.value, endsAt: '' });
          }}
        />
      </div>
    </FieldGroup>
  );
}
