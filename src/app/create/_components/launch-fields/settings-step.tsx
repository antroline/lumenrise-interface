'use client';

import { FieldGroup } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { numberValue, type LaunchDraft } from '../../_launch/launch-draft';
import { bondingAllocationError } from '../../_launch/launch-validation';
import { AllocationPreview } from './allocation-preview';
import { LaunchScheduleFields } from './launch-schedule-fields';
import { NumberField } from './number-field';
import { SwitchRow } from './switch-row';
import type { DraftProps } from './types';

export function SettingsStep({ draft, setDraft, errors = {} }: DraftProps) {
  const updateBonding = (patch: Partial<LaunchDraft['bonding']>) =>
    setDraft((current) => ({
      ...current,
      bonding: { ...current.bonding, ...patch },
    }));
  const updateFixed = (patch: Partial<LaunchDraft['fixed']>) =>
    setDraft((current) => ({
      ...current,
      fixed: { ...current.fixed, ...patch },
    }));
  const updateAuction = (patch: Partial<LaunchDraft['auction']>) =>
    setDraft((current) => ({
      ...current,
      auction: { ...current.auction, ...patch },
    }));
  const allocationError =
    draft.method === 'bonding' ? bondingAllocationError(draft.bonding) : null;
  if (draft.method === 'bonding')
    return (
      <FieldGroup>
        <p className="text-ui text-muted-foreground">
          Allocate the full supply between the curve, migration pool and team.
          These shares must add to 100%.
        </p>
        <div>
          <p className="mb-3 text-small font-semibold text-muted-foreground">
            Starting allocations · curve / pool / team
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                {
                  label: '80 / 20 / 0',
                  curveShare: '80',
                  poolShare: '20',
                  teamShare: '0',
                },
                {
                  label: '70 / 20 / 10',
                  curveShare: '70',
                  poolShare: '20',
                  teamShare: '10',
                },
                {
                  label: '60 / 30 / 10',
                  curveShare: '60',
                  poolShare: '30',
                  teamShare: '10',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                aria-label={`Set curve, pool and team allocation to ${option.curveShare}, ${option.poolShare} and ${option.teamShare} percent`}
                aria-pressed={
                  draft.bonding.curveShare === option.curveShare &&
                  draft.bonding.poolShare === option.poolShare &&
                  draft.bonding.teamShare === option.teamShare
                }
                onClick={() => updateBonding(option)}
                className={cn(
                  'min-h-10 rounded-full border px-4 text-small font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none motion-reduce:transform-none',
                  draft.bonding.curveShare === option.curveShare &&
                    draft.bonding.poolShare === option.poolShare &&
                    draft.bonding.teamShare === option.teamShare
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card hover:border-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div
          role="group"
          aria-label="Supply allocation"
          aria-describedby={
            allocationError ? 'bonding-allocation-error' : undefined
          }
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField
              id="curve-share"
              label="Bonding curve"
              unit="%"
              value={draft.bonding.curveShare}
              onChange={(curveShare) => updateBonding({ curveShare })}
            />
            <NumberField
              id="pool-share"
              label="Pool migration"
              unit="%"
              value={draft.bonding.poolShare}
              onChange={(poolShare) => updateBonding({ poolShare })}
              help="Tokens reserved for the pool after the raise target is reached. Increasing this share leaves fewer tokens on the curve."
              error={errors['pool-share']}
            />
            <NumberField
              id="team-share"
              label="Team allocation"
              unit="%"
              value={draft.bonding.teamShare}
              onChange={(teamShare) => updateBonding({ teamShare })}
              error={errors['team-share']}
            />
          </div>
          {allocationError && (
            <p
              id="bonding-allocation-error"
              role="alert"
              className="mt-3 text-small text-bad"
            >
              {allocationError}
            </p>
          )}
        </div>
        <AllocationPreview draft={draft} />
        {numberValue(draft.bonding.teamShare) > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              id="team-cliff"
              label="Team cliff"
              unit="months"
              value={draft.bonding.cliffMonths}
              onChange={(cliffMonths) => updateBonding({ cliffMonths })}
              error={errors['team-cliff']}
            />
            <NumberField
              id="team-vesting"
              label="Team vesting"
              unit="months"
              value={draft.bonding.vestingMonths}
              onChange={(vestingMonths) => updateBonding({ vestingMonths })}
              error={errors['team-vesting']}
            />
          </div>
        )}
        <SwitchRow
          label="Creator fee share"
          description="Preview only: proposed 0.1% of trades handled by the launch contract. Exact coverage depends on the contract."
          checked={draft.bonding.creatorFee}
          onChange={(creatorFee) => updateBonding({ creatorFee })}
        />
        <div className="border-t border-divider pt-5">
          <p className="mb-4 text-ui font-semibold">Launch timing</p>
          <LaunchScheduleFields
            method="bonding"
            startsAt={draft.bonding.startsAt}
            endsAt={draft.bonding.endsAt}
            durationDays={draft.bonding.durationDays}
            onChange={updateBonding}
            errors={errors}
          />
        </div>
      </FieldGroup>
    );
  if (draft.method === 'fixed')
    return (
      <FieldGroup>
        <LaunchScheduleFields
          method="fixed"
          startsAt={draft.fixed.startsAt}
          endsAt={draft.fixed.endsAt}
          durationDays={draft.fixed.durationDays}
          onChange={updateFixed}
          errors={errors}
        />
        <NumberField
          id="fixed-cap"
          label="Maximum purchase per wallet (optional)"
          unit={draft.quote}
          value={draft.fixed.walletCap}
          onChange={(walletCap) => updateFixed({ walletCap })}
          hint="Leave blank for no wallet cap. Contract limits will be confirmed before launch."
          groupThousands
          error={errors['fixed-cap']}
        />
      </FieldGroup>
    );
  return (
    <FieldGroup>
      <LaunchScheduleFields
        method="auction"
        startsAt={draft.auction.startsAt}
        endsAt={draft.auction.endsAt}
        durationDays={draft.auction.durationDays}
        onChange={updateAuction}
        errors={errors}
      />
      <NumberField
        id="auction-threshold"
        label="Minimum raise to launch"
        unit={draft.quote}
        value={draft.auction.threshold}
        onChange={(threshold) => updateAuction({ threshold })}
        help="If bids stay below this amount, the auction would not launch."
        placeholder="Enter a minimum raise"
        groupThousands
        error={errors['auction-threshold']}
      />
      <NumberField
        id="auction-timelock"
        label="Liquidity lock"
        unit="days"
        value={draft.auction.timelockDays}
        onChange={(timelockDays) => updateAuction({ timelockDays })}
        help="Number of days the post-auction liquidity position cannot be withdrawn. 0 means no lock."
        error={errors['auction-timelock']}
        presets={[
          { label: 'No lock', value: '0' },
          { label: '30 days', value: '30' },
          { label: '90 days', value: '90' },
          { label: '1 year', value: '365' },
        ]}
      />
    </FieldGroup>
  );
}
