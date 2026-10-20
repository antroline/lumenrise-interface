'use client';

import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { numberValue, type LaunchDraft } from '../../lib/launch-draft';
import { LaunchReveal } from '../launch-motion';
import { NumberField } from './number-field';
import type { DraftProps } from './types';

export function BondingTokenomics({ draft, setDraft, errors = {} }: DraftProps) {
  const updateBonding = (patch: Partial<LaunchDraft['bonding']>) => setDraft(current => ({ ...current, bonding: { ...current.bonding, ...patch } }));
  const updateAllocation = (patch: Partial<LaunchDraft['allocation']>) => setDraft(current => ({ ...current, allocation: { ...current.allocation, ...patch } }));
  return <FieldGroup className="gap-3">
    {/* Creator Raise sets the graduation target, so it leads and gets the widest track. */}
    <div className="grid grid-cols-2 gap-3 @min-[35rem]/launch:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="col-span-2 min-w-0 @min-[35rem]/launch:col-span-1">
        <NumberField id="creator-payout" label="Creator Raise" unit="$" value={draft.bonding.creatorPayout}
          onChange={creatorPayout => updateBonding({ creatorPayout })} groupThousands
          help="USDC paid to you at graduation, separate from trading tax. Enter 0 or at least $0.50. Your payout is at most 10% of the graduation reserve; the target adjusts automatically."
          error={errors['creator-payout']} />
      </div>
      <NumberField id="creator-fee" label="Creator Tax" unit="%" value={draft.bonding.creatorFee}
        onChange={creatorFee => updateBonding({ creatorFee })} error={errors['creator-fee']}
        help="Tax charged on trades handled by the launch contract. Accepts 0–10%, with up to 2 decimal places. Separate from Creator Raise." />
      <NumberField id="allocation-team" label="Team Allocation" unit="%" value={draft.allocation.teamShare}
        onChange={teamShare => updateAllocation({ teamShare })} error={errors['allocation-team']}
        help="Share of total supply reserved for the team. Enter 0–99.99%; the remaining supply is automatically split between the bonding curve and liquidity pool." />
    </div>
    <LaunchReveal show={numberValue(draft.allocation.teamShare) > 0}>
      <FieldSet className="gap-2 pt-3">
        <FieldLegend variant="label" className="mb-0 text-sm font-medium">Team vesting</FieldLegend>
        <FieldGroup className="grid grid-cols-2 gap-3">
          <NumberField id="team-cliff" label="Team cliff" unit="months" value={draft.allocation.cliffMonths}
            onChange={cliffMonths => updateAllocation({ cliffMonths })} error={errors['team-cliff']}
            help="Whole months before team tokens start unlocking. Set 0 for no cliff." />
          <NumberField id="team-vesting" label="Team vesting" unit="months" value={draft.allocation.vestingMonths}
            onChange={vestingMonths => updateAllocation({ vestingMonths })} error={errors['team-vesting']}
            help="Whole months of gradual unlocking after the cliff. Set 0 for no gradual vesting." />
        </FieldGroup>
      </FieldSet>
    </LaunchReveal>
  </FieldGroup>;
}
