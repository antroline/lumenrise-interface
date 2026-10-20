import {
  numberValue,
  validNonNegativeInteger,
  validOptionalUrl,
  validPercent,
  validPositive,
  validSupply,
  isLaunchScheduled,
  type LaunchDraft,
} from './launch-draft';
import { launchPreview } from './calculate-launch';
import { teamVestingError } from './team-vesting';

export function launchStartError(value: string, required = false): string | undefined {
  if (!value && required) return 'Choose a launch date and time.';
  if (value && (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()))
    return 'Choose a start time in the future.';
}

export type WizardStep =
  | 'project'
  | 'method'
  | 'token'
  | 'supply'
  | 'allocation'
  | 'sale'
  | 'settings'
  | 'eligibility'
  | 'vesting'
  | 'review';
export type FieldErrors = Record<string, string>;

export const saleSteps: WizardStep[] = [
  'project',
  'method',
  'token',
  'sale',
  'settings',
  'eligibility',
  'vesting',
  'review',
];
export const bondingSteps: WizardStep[] = [
  'project',
  'method',
  'token',
  'sale',
  'settings',
  'eligibility',
  'review',
];

export const stepLabels: Record<WizardStep, string> = {
  project: 'Token info',
  method: 'Launch method',
  token: 'Supply & allocation',
  supply: 'Token setup',
  allocation: 'Allocation',
  sale: 'Sale terms',
  settings: 'Launch settings',
  eligibility: 'Eligibility',
  vesting: 'Vesting',
  review: 'Review',
};

export function allocationError(
  allocation: LaunchDraft['allocation'],
): string | null {
  const shares = [
    allocation.saleShare,
    allocation.poolShare,
    allocation.teamShare,
  ];
  if (!shares.every((value) => validPercent(value)))
    return 'Enter each share from 0% to 100%, with up to 2 decimal places.';
  const totalBasisPoints = shares.reduce(
    (total, value) => total + Math.round(numberValue(value) * 100),
    0,
  );
  return totalBasisPoints === 10_000
    ? null
    : `${totalBasisPoints / 100}% allocated. Launch, pool and team must total 100%.`;
}

export function validateLaunchStep(
  draft: LaunchDraft,
  step: WizardStep,
): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 'project') {
    if (!draft.name.trim() || draft.name.trim().length > 40)
      errors['project-name'] = 'Enter a project name of up to 40 characters.';
    if (!/^[A-Z0-9]{1,12}$/.test(draft.symbol))
      errors['launch-symbol'] = 'Use 1–12 letters or numbers.';
    if (!draft.logo)
      errors['launch-logo'] =
        'Add a project image (PNG, JPG or WebP, under 1 MB).';
    if (!draft.description.trim())
      errors['launch-description'] = 'Briefly describe the project.';
    else if (draft.description.length > 3000)
      errors['launch-description'] = 'Use up to 3000 characters.';
    if (!draft.xAccount.trim())
      errors['launch-x'] = 'Enter your project’s X account link.';
    else if (!validOptionalUrl(draft.xAccount))
      errors['launch-x'] =
        'Enter an HTTPS URL of up to 2048 characters without embedded credentials.';
    if (!draft.website.trim())
      errors['launch-website'] = 'Enter your project’s website link.';
    else if (!validOptionalUrl(draft.website))
      errors['launch-website'] =
        'Enter an HTTPS URL of up to 2048 characters without embedded credentials.';
  }

  if (step === 'method' && !draft.methodSelected)
    errors['launch-methods'] = 'Choose a launch method to continue.';

  if (step === 'token' || step === 'supply') {
    if (!validSupply(draft.supply))
      errors['launch-supply'] =
        'Enter a positive supply within Stellar’s limit, with up to 7 decimal places.';
  }

  if (step === 'token' || step === 'allocation') {
    if (draft.method === 'bonding') {
      const payout = numberValue(draft.bonding.creatorPayout);
      if (!/^\d+(?:\.\d{1,7})?$/.test(draft.bonding.creatorPayout.trim()) || !Number.isFinite(payout) || (payout > 0 && payout < 0.5))
        errors['creator-payout'] = 'Enter $0 or at least $0.50, with up to 7 decimal places.';
      if (!validPercent(draft.bonding.creatorFee) || numberValue(draft.bonding.creatorFee) > 10)
        errors['creator-fee'] = 'Enter 0–10%, with up to 2 decimal places.';
      if (!validPercent(draft.allocation.teamShare) || numberValue(draft.allocation.teamShare) >= 100)
        errors['allocation-team'] = 'Enter 0–99.99%, with up to 2 decimal places.';
      const { error } = launchPreview(draft);
      if (error && !Object.keys(errors).length && validSupply(draft.supply)) errors['creator-payout'] = error;
    }
    const invalidAllocation = draft.method === 'bonding' ? null : allocationError(draft.allocation);
    if (invalidAllocation) errors['allocation-sale'] = invalidAllocation;
    else if (draft.method !== 'bonding' && !validPercent(draft.allocation.saleShare, false))
      errors['allocation-sale'] = 'Allocate more than 0% to the launch.';
    const { teamShare, cliffMonths, vestingMonths } = draft.allocation;
    if (numberValue(teamShare) > 0) {
      const cliffError = teamVestingError(cliffMonths);
      const vestingError = teamVestingError(vestingMonths);
      if (cliffError) errors['team-cliff'] = cliffError;
      if (vestingError) errors['team-vesting'] = vestingError;
    }
  }

  if (step === 'sale') {
    if (draft.method === 'bonding' && draft.quote !== 'USDC')
      errors['launch-quote'] = 'Choose USDC. XLM requires a dollar conversion and is not available yet.';
    if (draft.method === 'fixed') {
      if (!validPositive(draft.fixed.price))
        errors['fixed-price'] =
          `Enter a positive price in ${draft.quote} per token.`;
    }
    if (draft.method === 'auction') {
      if (!validPercent(draft.auction.liquidityShare))
        errors['auction-liquidity'] =
          'Enter 0–100% of the raised payment asset.';
      if (!validPositive(draft.auction.floorPrice))
        errors['auction-floor'] =
          `Enter a positive floor price in ${draft.quote}.`;
    }
  }

  if (step === 'settings') {
    if (draft.method === 'bonding') {
      const error = isLaunchScheduled(draft.bonding) ? launchStartError(draft.bonding.startsAt, true) : undefined;
      if (error) errors['bonding-start'] = error;
    }
    if (draft.method === 'fixed') {
      validateDates(
        draft.fixed.startsAt,
        draft.fixed.endsAt,
        'fixed-start',
        'fixed-end',
        errors,
        Number(draft.fixed.durationDays),
      );
      if (draft.fixed.walletCap && !validPositive(draft.fixed.walletCap))
        errors['fixed-cap'] = 'Enter a positive amount or leave this blank.';
    }
    if (draft.method === 'auction') {
      validateDates(
        draft.auction.startsAt,
        draft.auction.endsAt,
        'auction-start',
        'auction-end',
        errors,
        Number(draft.auction.durationDays),
      );
      if (!validPositive(draft.auction.threshold))
        errors['auction-threshold'] =
          `Enter a positive minimum raise in ${draft.quote}.`;
      if (!validNonNegativeInteger(draft.auction.timelockDays))
        errors['auction-timelock'] = 'Enter whole days, or 0 for no lock.';
    }
  }

  if (step === 'eligibility') {
    if (
      draft.eligibility.mode !== 'open' &&
      !draft.eligibility.requirements.trim()
    ) {
      errors['eligibility-requirements'] =
        'Describe who qualifies and how the rule should be checked.';
    }
    if (
      draft.eligibility.identificationMode === 'required' &&
      !draft.eligibility.identificationRequirements.trim()
    ) {
      errors['identification-requirements'] =
        'Describe the identity check required for participants.';
    }
  }

  if (step === 'vesting' && draft.participantVesting.mode === 'linear') {
    const { tgePercent, cliffMonths, durationMonths } =
      draft.participantVesting;
    if (!validPercent(tgePercent) || numberValue(tgePercent) >= 100)
      errors['vesting-tge'] = 'Choose 0–99.99% unlocked at launch.';
    if (!validNonNegativeInteger(cliffMonths))
      errors['vesting-cliff'] =
        'Enter a whole number of months, starting at 0.';
    if (
      !validNonNegativeInteger(durationMonths) ||
      numberValue(durationMonths) <= 0
    )
      errors['vesting-duration'] = 'Enter a positive whole number of months.';
  }

  return errors;
}

function validateDates(
  startValue: string,
  endValue: string,
  startId: string,
  endId: string,
  errors: FieldErrors,
  defaultDurationDays?: number,
) {
  const start = startValue
    ? Date.parse(startValue)
    : defaultDurationDays === undefined
      ? NaN
      : Date.now();
  const end = endValue
    ? Date.parse(endValue)
    : defaultDurationDays === undefined
      ? NaN
      : start + defaultDurationDays * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(start))
    errors[startId] = 'Choose a start date and time.';
  else if (startValue && start <= Date.now())
    errors[startId] = 'Choose a start time in the future.';
  if (!Number.isFinite(end)) errors[endId] = 'Choose an end date and time.';
  else if (Number.isFinite(start) && end <= start)
    errors[endId] = 'Choose an end after the start.';
}
