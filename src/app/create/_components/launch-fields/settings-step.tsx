'use client';

import { FieldGroup } from '@/components/ui/field';
import type { LaunchDraft } from '../../_launch/launch-draft';
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
  if (draft.method === 'bonding')
    return (
      <FieldGroup>
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
