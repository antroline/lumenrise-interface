'use client';

import { Clock3, Unlock } from 'lucide-react';
import { FieldGroup } from '@/components/ui/field';
import type { LaunchDraft } from '../../_launch/launch-draft';
import { ChoiceCards } from './choice-cards';
import { NumberField } from './number-field';
import type { DraftProps } from './types';

export function ParticipantVestingStep({
  draft,
  setDraft,
  errors = {},
}: DraftProps) {
  const update = (patch: Partial<LaunchDraft['participantVesting']>) =>
    setDraft((current) => ({
      ...current,
      participantVesting: { ...current.participantVesting, ...patch },
    }));
  return (
    <FieldGroup>
      <ChoiceCards
        title="Participant token release"
        value={draft.participantVesting.mode}
        options={
          [
            {
              value: 'immediate',
              title: 'All at launch',
              detail: 'Everything unlocks at launch.',
              icon: Unlock,
            },
            {
              value: 'linear',
              title: 'Unlock over time',
              detail: 'Release part now, then vest the rest.',
              icon: Clock3,
            },
          ] as const
        }
        onChange={(mode) => update({ mode })}
      />
      {draft.participantVesting.mode === 'linear' && (
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            id="vesting-tge"
            label="Unlocked at launch"
            unit="%"
            value={draft.participantVesting.tgePercent}
            onChange={(tgePercent) => update({ tgePercent })}
            help="The rest vests after the cliff."
            error={errors['vesting-tge']}
          />
          <NumberField
            id="vesting-cliff"
            label="Cliff"
            unit="months"
            value={draft.participantVesting.cliffMonths}
            onChange={(cliffMonths) => update({ cliffMonths })}
            help="Waiting period before gradual release begins."
            error={errors['vesting-cliff']}
          />
          <NumberField
            id="vesting-duration"
            label="Vesting duration"
            unit="months"
            value={draft.participantVesting.durationMonths}
            onChange={(durationMonths) => update({ durationMonths })}
            help="Time over which the remaining allocation unlocks."
            error={errors['vesting-duration']}
          />
        </div>
      )}
    </FieldGroup>
  );
}
