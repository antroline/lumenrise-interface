'use client';

import { FieldGroup } from '@/components/ui/field';
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
  return (
    <FieldGroup className="gap-5 short:gap-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-body font-semibold">Launch timing</h3>
        <p className="text-body text-muted-foreground">
          Starts immediately by default. Choose a duration or custom dates in your
          local time zone.
        </p>
      </div>
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
