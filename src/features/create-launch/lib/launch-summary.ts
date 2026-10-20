import {
  formatAmount,
  methodLabels,
  numberValue,
  validNonNegativeInteger,
  validSupply,
  type LaunchDraft,
} from './launch-draft';
import { allocationError, type WizardStep } from './launch-validation';
import { calculatedAllocation, formatLaunchNumber, launchPreview } from './calculate-launch';

export type LaunchSummaryRow = { label: string; value: string };

function dateLabel(value: string, fallback: string) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    : fallback;
}

export function launchSummaryRows(draft: LaunchDraft, step: WizardStep): LaunchSummaryRow[] {
  const allocation = calculatedAllocation(draft);
  const { calculation } = launchPreview(draft);
  switch (step) {
    case 'project':
      return [
        { label: 'Name', value: draft.name.trim() },
        { label: 'Symbol', value: draft.symbol },
      ].filter((row) => row.value);
    case 'method':
      return draft.methodSelected ? [{ label: 'Method', value: methodLabels[draft.method] }] : [];
    case 'token':
      return [...launchSummaryRows(draft, 'supply'), ...launchSummaryRows(draft, 'allocation')];
    case 'supply':
      return [
        ...(validSupply(draft.supply) ? [{ label: 'Supply', value: `${formatAmount(draft.supply)} ${draft.symbol}`.trim() }] : []),
      ];
    case 'allocation':
      return [
        ...(!allocationError(allocation) ? [
          ...(calculation ? [
            { label: 'Creator Raise', value: `$${formatAmount(draft.bonding.creatorPayout)}` },
            { label: 'Creator Tax', value: `${numberValue(draft.bonding.creatorFee)}%` },
            { label: 'Graduation target', value: `$${formatLaunchNumber(calculation.graduationTarget)}` },
          ] : []),
          { label: 'Bonding curve', value: `${numberValue(allocation.saleShare)}%` },
          { label: 'Liquidity pool', value: `${numberValue(allocation.poolShare)}%` },
          { label: 'Team', value: `${numberValue(draft.allocation.teamShare)}%` },
        ] : []),
        ...(numberValue(draft.allocation.teamShare) > 0 && validNonNegativeInteger(draft.allocation.vestingMonths)
          ? [{ label: 'Team vesting', value: numberValue(draft.allocation.vestingMonths) === 0 ? 'No vesting' : `${formatAmount(draft.allocation.vestingMonths)} mo` }]
          : []),
      ];
    case 'sale':
      return calculation
        ? [{ label: 'Raise target', value: `$${formatLaunchNumber(calculation.graduationTarget)} USDC` }]
        : [];
    case 'settings':
      return [
        { label: 'Starts', value: dateLabel(draft.bonding.startsAt, 'Immediately') },
      ];
    case 'eligibility':
      return [
        { label: 'Access', value: draft.eligibility.mode.charAt(0).toUpperCase() + draft.eligibility.mode.slice(1) },
        { label: 'Identity check', value: draft.eligibility.identificationMode === 'required' ? 'Required' : 'None' },
      ];
    case 'vesting':
      return [{ label: 'Release', value: draft.participantVesting.mode === 'immediate' ? 'At launch' : `${draft.participantVesting.durationMonths} months` }];
    case 'review':
      return [];
  }
}
