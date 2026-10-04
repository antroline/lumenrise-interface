import {
  numberValue,
  validNonNegativeInteger,
  validOptionalUrl,
  validPercent,
  validPositive,
  validSupply,
  type LaunchDraft,
} from './launch-draft';

export type WizardStep =
  | 'project'
  | 'method'
  | 'token'
  | 'sale'
  | 'settings'
  | 'eligibility'
  | 'vesting'
  | 'review'
  | 'basic';
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
export const basicSteps: WizardStep[] = ['project', 'method', 'basic'];

export const stepLabels: Record<WizardStep, string> = {
  project: 'Project',
  method: 'Launch method',
  token: 'Token supply',
  sale: 'Sale terms',
  settings: 'Launch settings',
  eligibility: 'Eligibility',
  vesting: 'Vesting',
  review: 'Review',
  basic: 'Create token',
};

export function bondingAllocationError(
  bonding: LaunchDraft['bonding'],
): string | null {
  const shares = [bonding.curveShare, bonding.poolShare, bonding.teamShare];
  if (!shares.every((value) => validPercent(value)))
    return 'Enter each share from 0% to 100%, with up to 2 decimal places.';
  const totalBasisPoints = shares.reduce(
    (total, value) => total + Math.round(numberValue(value) * 100),
    0,
  );
  return totalBasisPoints === 10_000
    ? null
    : `${totalBasisPoints / 100}% allocated. Curve, pool and team must total 100%.`;
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
    if (!validOptionalUrl(draft.xAccount))
      errors['launch-x'] =
        'Enter a complete https:// link or leave this blank.';
    if (!validOptionalUrl(draft.website))
      errors['launch-website'] =
        'Enter a complete https:// link or leave this blank.';
  }

  if (step === 'method' && !draft.methodSelected)
    errors['launch-methods'] = 'Choose a launch method to continue.';

  if (step === 'token') {
    if (!validSupply(draft.supply))
      errors['launch-supply'] =
        'Enter a positive supply within Stellar’s limit, with up to 7 decimal places.';
  }

  if (step === 'sale') {
    if (draft.method === 'bonding' && !validPositive(draft.bonding.target))
      errors['curve-target'] =
        `Enter a positive graduation target in ${draft.quote}.`;
    if (draft.method === 'fixed') {
      if (!validPercent(draft.fixed.saleShare, false))
        errors['fixed-share'] = 'Enter a sale share above 0% and at most 100%.';
      if (!validPositive(draft.fixed.price))
        errors['fixed-price'] =
          `Enter a positive price in ${draft.quote} per token.`;
    }
    if (draft.method === 'auction') {
      if (!validPercent(draft.auction.saleShare, false))
        errors['auction-share'] =
          'Enter an auction share above 0% and at most 100%.';
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
      const { teamShare, cliffMonths, vestingMonths } = draft.bonding;
      const allocationError = bondingAllocationError(draft.bonding);
      if (allocationError) errors['curve-share'] = allocationError;
      validateDates(
        draft.bonding.startsAt,
        draft.bonding.endsAt,
        'bonding-start',
        'bonding-end',
        errors,
        Number(draft.bonding.durationDays),
      );
      if (numberValue(teamShare) > 0) {
        if (!validNonNegativeInteger(cliffMonths))
          errors['team-cliff'] =
            'Enter a whole number of months, starting at 0.';
        if (
          !validNonNegativeInteger(vestingMonths) ||
          numberValue(vestingMonths) <= 0
        )
          errors['team-vesting'] = 'Enter a positive whole number of months.';
      }
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
      draft.method === 'auction' &&
      draft.auction.identificationMode === 'required' &&
      !draft.auction.identificationRequirements.trim()
    ) {
      errors['identification-requirements'] =
        'Describe the identity check required for this auction.';
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
