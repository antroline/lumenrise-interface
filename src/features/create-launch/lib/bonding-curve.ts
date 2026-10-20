import {
  initialLaunchDraft,
  bondingStartDate,
  isLaunchScheduled,
  type LaunchDraft,
} from './launch-draft';
import {
  requireCreator,
  validateInput,
} from './launch-state';
import { assetFor, NETWORK } from './transactions';
import { calculateDraftLaunch } from './calculate-launch';
import { monthsToSeconds } from './team-vesting';

export const FACTORY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID?.trim() ?? '';

const PAIR_SACS = {
  USDC: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
};

export type LaunchParams = {
  owner: string;
  asset: string;
  pair: string;
  metadata: { name: string; description: string; logo: string; symbol: string };
  allocations: { pool_bps: number; curve_bps: number; team_bps: number };
  vesting: {
    cliff_seconds: string;
    duration_seconds: string;
    schedule: { tag: 'Daily' | 'Weekly' | 'Monthly' };
  };
  curve: {
    virtual_base_reserve: string;
    virtual_quote_reserve: string;
    graduation_target: string;
    creator_fee_bps: number;
    creator_payout_bps: number;
  };
  starts_at: string;
  reputation_label: string;
};

function matchesDraftShape(value: unknown, sample: unknown): boolean {
  if (sample === null || typeof sample !== 'object')
    return typeof value === typeof sample;
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(sample).every(
      ([key, field]) =>
        key in value && matchesDraftShape(Reflect.get(value, key), field),
    )
  );
}

export function isBondingDraft(value: unknown): value is LaunchDraft {
  return (
    matchesDraftShape(value, initialLaunchDraft) &&
    !!value &&
    typeof value === 'object' &&
    'method' in value &&
    value.method === 'bonding' &&
    'quote' in value &&
    (value.quote === 'USDC' || value.quote === 'XLM') &&
    'bonding' in value &&
    !!value.bonding &&
    typeof value.bonding === 'object' &&
    (!('scheduleEnabled' in value.bonding) || typeof value.bonding.scheduleEnabled === 'boolean') &&
    'durationDays' in value.bonding &&
    ['7', '14', '30', '60'].includes(String(value.bonding.durationDays))
  );
}

function unixSeconds(value: string) {
  const seconds = Math.floor(Date.parse(value) / 1000);
  if (!Number.isSafeInteger(seconds) || seconds < 0)
    throw new Error('Choose a valid launch date and time.');
  return seconds;
}

export function buildBondingCurveParams(
  draft: LaunchDraft,
  owner: string,
  issuer: string,
  logo: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): LaunchParams {
  if (draft.method !== 'bonding')
    throw new Error('Only bonding-curve launches are connected.');
  if (draft.quote !== 'USDC')
    throw new Error('Dollar-based launches currently support USDC only. XLM requires a price conversion.');
  requireCreator(owner);
  // The contract stores the server-hosted image URL; local previews (data or
  // blob URLs) must never reach `metadata.logo`.
  if (!/^https?:\/\//.test(logo))
    throw new Error('Upload the project image before launching.');
  const token = validateInput({
    name: draft.name,
    code: draft.symbol,
    amount: draft.supply,
  });
  const calculation = calculateDraftLaunch(draft);
  if (!draft.description.trim() || draft.description.length > 3000)
    throw new Error('Enter a project description of up to 3000 characters.');
  const hasTeam = calculation.allocations.team_bps > 0;
  const durationSeconds = hasTeam ? monthsToSeconds(draft.allocation.vestingMonths) : '0';
  const scheduledStart = bondingStartDate(draft.bonding);
  if (isLaunchScheduled(draft.bonding) && !scheduledStart)
    throw new Error('Choose a launch date and time.');
  const startsAt = scheduledStart
    ? unixSeconds(scheduledStart)
    : nowSeconds + 60;
  if (startsAt <= nowSeconds)
    throw new Error('Choose a future start.');

  return {
    owner,
    asset: assetFor(token.code, issuer).contractId(NETWORK),
    pair: PAIR_SACS[draft.quote],
    metadata: {
      name: token.name,
      description: draft.description,
      logo,
      symbol: token.code,
    },
    allocations: calculation.allocations,
    vesting: {
      cliff_seconds: hasTeam ? monthsToSeconds(draft.allocation.cliffMonths) : '0',
      duration_seconds: durationSeconds,
      schedule: { tag: 'Weekly' }, // needs a field — unlock schedule; allowed: Daily, Weekly, Monthly.
    },
    curve: {
      ...calculation.contract,
      creator_fee_bps: calculation.creatorTaxBps,
      creator_payout_bps: calculation.creatorPayoutBps,
    },
    starts_at: String(startsAt),
    reputation_label: '0',
  };
}
