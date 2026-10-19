import {
  formatAmount,
  methodLabels,
  numberValue,
  validNonNegativeInteger,
  validPositive,
  validPercent,
  validSupply,
  type LaunchDraft,
} from './launch-draft';
import { allocationError, type WizardStep } from './launch-validation';

export type LaunchSummaryRow = { label: string; value: string };

function dateLabel(value: string, fallback: string) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    : fallback;
}

export function launchSummaryRows(draft: LaunchDraft, step: WizardStep): LaunchSummaryRow[] {
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
        ...(validSupply(draft.supply) ? [{ label: 'Supply', value: `${formatAmount(draft.supply)} ${draft.symbol}` }] : []),
      ];
    case 'allocation':
      return [
        ...(!allocationError(draft.allocation) ? [
          { label: 'Bonding curve', value: `${numberValue(draft.allocation.saleShare)}%` },
          { label: 'Liquidity pool', value: `${numberValue(draft.allocation.poolShare)}%` },
          { label: 'Team', value: `${numberValue(draft.allocation.teamShare)}%` },
        ] : []),
        ...(numberValue(draft.allocation.teamShare) > 0 && validNonNegativeInteger(draft.allocation.vestingMonths)
          ? [{ label: 'Team vesting', value: numberValue(draft.allocation.vestingMonths) === 0 ? 'No vesting' : `${formatAmount(draft.allocation.vestingMonths)} mo` }]
          : []),
      ];
    case 'sale':
      return validPositive(draft.bonding.target)
        ? [{ label: 'Raise target', value: `${formatAmount(draft.bonding.target)} ${draft.quote}` }]
        : [];
    case 'settings':
      return [
        { label: 'Starts', value: dateLabel(draft.bonding.startsAt, 'Immediately') },
        ...(validPercent(draft.bonding.creatorFee) ? [{ label: 'Creator fee', value: `${numberValue(draft.bonding.creatorFee)}%` }] : []),
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
