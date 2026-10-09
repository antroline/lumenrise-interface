'use client';

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  allocationLabels,
  formatAmount,
  numberValue,
  type LaunchDraft,
} from '../../_launch/launch-draft';
import { allocationError } from '../../_launch/launch-validation';
import { AllocationPreview } from './allocation-preview';
import { NumberField } from './number-field';
import { PresetChoices } from './preset-choices';
import type { DraftProps } from './types';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';

export function TokenSetupStep({ draft, setDraft, errors = {} }: DraftProps) {
  const update = (patch: Partial<LaunchDraft['allocation']>) =>
    setDraft((current) => ({
      ...current,
      allocation: { ...current.allocation, ...patch },
    }));
  const invalidAllocation = allocationError(draft.allocation);
  const presets = [
    { label: '80 / 20 / 0', value: '80', poolShare: '20', teamShare: '0' },
    { label: '70 / 20 / 10', value: '70', poolShare: '20', teamShare: '10' },
    { label: '60 / 30 / 10', value: '60', poolShare: '30', teamShare: '10' },
  ];
  return (
    <FieldGroup className="gap-7 short:gap-5">
      <div>
        <NumberField
          id="launch-supply"
          label="Total supply"
          value={draft.supply}
          onChange={(supply) => setDraft((current) => ({ ...current, supply }))}
          unit={draft.symbol || 'tokens'}
          help="Choose a preset or enter an exact supply. You can change it before launching."
          groupThousands
          error={errors['launch-supply']}
          presets={[
            { label: '10M', value: '10000000' },
            { label: '100M', value: '100000000' },
            { label: '1B', value: '1000000000' },
            { label: '10B', value: '10000000000' },
            { label: '100B', value: '100000000000' },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-divider pt-4 short:mt-3 short:pt-3">
          <span className="text-small text-muted-foreground">
            Your token supply
          </span>
          <strong className="break-all text-[20px] font-semibold tracking-[-0.02em] tabular-nums">
            {formatAmount(draft.supply)}{' '}
            <span className="text-small text-muted-foreground">
              {draft.symbol || 'tokens'}
            </span>
          </strong>
        </div>
      </div>
      <FieldSet className="border-t border-divider pt-5 short:pt-4">
        <FieldLegend>Token allocation</FieldLegend>
        <FieldDescription>
          Divide the total supply between the launch, liquidity pool and team.
          The three shares must add up to 100%.
        </FieldDescription>
        <FieldGroup className="short:gap-4">
          <div>
            <p className="mb-3 text-small text-muted-foreground">
              Starting allocations · launch / pool / team
            </p>
            <PresetChoices
              label="Launch, pool and team allocation"
              value={
                presets.find(
                  (preset) =>
                    preset.value === draft.allocation.saleShare &&
                    preset.poolShare === draft.allocation.poolShare &&
                    preset.teamShare === draft.allocation.teamShare,
                )?.value ?? ''
              }
              options={presets}
              onChange={(value) => {
                const preset = presets.find((option) => option.value === value);
                if (preset)
                  update({
                    saleShare: value,
                    poolShare: preset.poolShare,
                    teamShare: preset.teamShare,
                  });
              }}
            />
          </div>
          <FieldGroup className="grid gap-4 @md/launch:grid-cols-2 @2xl/launch:grid-cols-3">
            <NumberField
              id="allocation-sale"
              label={`${allocationLabels[draft.method]} allocation`}
              unit="%"
              value={draft.allocation.saleShare}
              onChange={(saleShare) => update({ saleShare })}
              help={`Percentage of the total token supply offered to participants through ${allocationLabels[draft.method].toLowerCase()}. Pool and team tokens are allocated separately.`}
              error={
                errors['allocation-sale'] && !invalidAllocation
                  ? errors['allocation-sale']
                  : undefined
              }
              descriptionId={invalidAllocation ? 'allocation-error' : undefined}
              invalid={!!invalidAllocation}
            />
            <NumberField
              id="allocation-pool"
              label="Liquidity pool"
              unit="%"
              value={draft.allocation.poolShare}
              onChange={(poolShare) => update({ poolShare })}
              help="Percentage of the total token supply reserved for the liquidity pool after the launch. This is a share of tokens, not of the payment asset raised."
              descriptionId={invalidAllocation ? 'allocation-error' : undefined}
              invalid={!!invalidAllocation}
            />
            <NumberField
              id="allocation-team"
              label="Team allocation"
              unit="%"
              value={draft.allocation.teamShare}
              onChange={(teamShare) => update({ teamShare })}
              help="Percentage of the total token supply reserved for the team. Set it to 0% for no team allocation. A positive share also needs a team vesting schedule."
              descriptionId={invalidAllocation ? 'allocation-error' : undefined}
              invalid={!!invalidAllocation}
            />
          </FieldGroup>
          <LaunchFieldError
            id="allocation-error"
            role="status"
            className="text-small text-bad"
          >
            {invalidAllocation}
          </LaunchFieldError>
          <AllocationPreview draft={draft} />
          <LaunchReveal show={numberValue(draft.allocation.teamShare) > 0}>
            <FieldSet>
              <FieldLegend variant="label">Team vesting</FieldLegend>
              <FieldGroup className="grid gap-4 @md/launch:grid-cols-2">
                <NumberField
                  id="team-cliff"
                  label="Team cliff"
                  unit="months"
                  value={draft.allocation.cliffMonths}
                  onChange={(cliffMonths) => update({ cliffMonths })}
                  help="Waiting period before the team allocation begins to unlock. Set 0 for no cliff."
                  error={errors['team-cliff']}
                />
                <NumberField
                  id="team-vesting"
                  label="Team vesting"
                  unit="months"
                  value={draft.allocation.vestingMonths}
                  onChange={(vestingMonths) => update({ vestingMonths })}
                  help="Number of months over which team tokens gradually unlock after the cliff."
                  error={errors['team-vesting']}
                />
              </FieldGroup>
            </FieldSet>
          </LaunchReveal>
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}
