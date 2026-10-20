'use client';

import { Check, TriangleAlert } from 'lucide-react';
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
  allocationLabels,
  formatSupplyShare,
  numberValue,
  validPercent,
  type LaunchDraft,
} from '../../lib/launch-draft';
import { allocationError } from '../../lib/launch-validation';
import { AllocationBar } from './allocation-bar';
import { AllocationPresets } from './allocation-presets';
import { AllocationRow } from './allocation-row';
import { NumberField } from './number-field';
import type { DraftProps } from './types';
import { LaunchFieldError, LaunchReveal } from '../launch-motion';
import { BondingTokenomics } from './bonding-tokenomics';

export function TokenSetupStep({ draft, setDraft, errors = {} }: DraftProps) {
  if (draft.method === 'bonding') return <BondingTokenomics draft={draft} setDraft={setDraft} errors={errors} />;
  const update = (patch: Partial<LaunchDraft['allocation']>) =>
    setDraft((current) => ({
      ...current,
      allocation: { ...current.allocation, ...patch },
    }));
  const invalidAllocation = allocationError(draft.allocation);
  const saleLabel = allocationLabels[draft.method];
  const presets = [
    { label: '80 / 20 / 0', value: '80', poolShare: '20', teamShare: '0' },
    { label: '70 / 20 / 10', value: '70', poolShare: '20', teamShare: '10' },
    { label: '60 / 30 / 10', value: '60', poolShare: '30', teamShare: '10' },
  ];
  const shares = [
    draft.allocation.saleShare,
    draft.allocation.poolShare,
    draft.allocation.teamShare,
  ];
  const totalPercent = shares.every((share) => validPercent(share))
    ? shares.reduce(
        (total, share) => total + Math.round(numberValue(share) * 100),
        0,
      ) / 100
    : null;
  const saleFieldError = invalidAllocation
    ? undefined
    : errors['allocation-sale'];
  const barShares = [
    {
      id: 'sale',
      label: saleLabel,
      percent: draft.allocation.saleShare,
      segment: 'bg-foreground',
      onSegment: 'text-background',
    },
    {
      id: 'pool',
      label: 'Liquidity pool',
      percent: draft.allocation.poolShare,
      segment: 'bg-lime',
      onSegment: 'text-primary-foreground',
    },
    {
      id: 'team',
      label: 'Team',
      percent: draft.allocation.teamShare,
      segment: 'bg-orange',
      onSegment: 'text-primary-foreground',
    },
  ];
  return (
    <FieldGroup className="gap-4">
      <FieldSet className="gap-4">
        <FieldLegend className="sr-only">Token allocation</FieldLegend>
        <FieldGroup className="gap-4">
          <div>
            <p className="mb-2 studio-compact:mb-1 text-small text-muted-foreground">Allocation presets</p>
            <AllocationPresets
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
          <div>
            <div className="mb-2.5 studio-compact:mb-1 flex items-center justify-between gap-3">
              <span className="text-small text-muted-foreground">
                Distribution
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 studio-compact:py-0 text-small font-semibold tabular-nums transition-colors duration-200',
                  invalidAllocation
                    ? 'bg-bad-soft text-bad'
                    : 'bg-ok-soft text-ok',
                )}
              >
                {invalidAllocation ? (
                  <TriangleAlert aria-hidden="true" className="size-3.5" />
                ) : (
                  <Check aria-hidden="true" className="size-3.5" />
                )}
                Total {totalPercent ?? '—'}%
              </span>
            </div>
            <AllocationBar shares={barShares} invalid={!!invalidAllocation} />
          </div>
          <div className="divide-y divide-divider">
            <AllocationRow
              id="allocation-sale"
              label={saleLabel}
              value={draft.allocation.saleShare}
              onChange={(saleShare) => update({ saleShare })}
              amount={`${formatSupplyShare(draft.supply, draft.allocation.saleShare)} ${draft.symbol || 'tokens'}`}
              help={`Percentage of the total token supply offered to participants through ${saleLabel.toLowerCase()}. Pool and team tokens are allocated separately.`}
              swatch="bg-foreground"
              invalid={!!invalidAllocation || !!saleFieldError}
              descriptionId={
                invalidAllocation
                  ? 'allocation-error'
                  : saleFieldError
                    ? 'allocation-sale-error'
                    : undefined
              }
            />
            <AllocationRow
              id="allocation-pool"
              label="Liquidity pool"
              value={draft.allocation.poolShare}
              onChange={(poolShare) => update({ poolShare })}
              amount={`${formatSupplyShare(draft.supply, draft.allocation.poolShare)} ${draft.symbol || 'tokens'}`}
              help="Percentage of the total token supply reserved for the liquidity pool after the launch. This is a share of tokens, not of the payment asset raised."
              swatch="bg-lime"
              invalid={!!invalidAllocation}
              descriptionId={invalidAllocation ? 'allocation-error' : undefined}
            />
            <AllocationRow
              id="allocation-team"
              label="Team"
              value={draft.allocation.teamShare}
              onChange={(teamShare) => update({ teamShare })}
              amount={`${formatSupplyShare(draft.supply, draft.allocation.teamShare)} ${draft.symbol || 'tokens'}`}
              help="Percentage of the total token supply reserved for the team. Set it to 0% for no team allocation. A positive share also needs a team vesting schedule."
              swatch="bg-orange"
              invalid={!!invalidAllocation}
              descriptionId={invalidAllocation ? 'allocation-error' : undefined}
            />
          </div>
          <LaunchFieldError
            id="allocation-error"
            role="status"
            className="text-small text-bad"
          >
            {invalidAllocation}
          </LaunchFieldError>
          <LaunchFieldError
            id="allocation-sale-error"
            className="text-small text-bad"
          >
            {saleFieldError}
          </LaunchFieldError>
          <LaunchReveal show={numberValue(draft.allocation.teamShare) > 0}>
            <FieldSet>
              <FieldLegend variant="label">Team vesting</FieldLegend>
              <FieldGroup className="grid gap-4 studio-compact:gap-2 @md/launch:grid-cols-2">
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
                  help="Number of months over which team tokens gradually unlock after the cliff. Set 0 for no gradual vesting."
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
