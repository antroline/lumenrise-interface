import {
  initialLaunchDraft,
  validNonNegativeInteger,
  validPercent,
  type LaunchDraft,
} from './launch-draft';
import {
  requireCreator,
  toUnits,
  validateAmount,
  validateInput,
} from './launch-state';
import { assetFor, NETWORK } from './transactions';

export const FACTORY_CONTRACT_ID =
  'CDG76JM6I67SGIV5ZN4WK6DW54ZUWPL6BMXD234ULWIERXRRYJ5QVDZC';

const PAIR_SACS = {
  USDC: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
};
const MONTH_SECONDS = BigInt(30 * 24 * 60 * 60);
const MAX_U64 = BigInt('18446744073709551615');

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
  ends_at: string;
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
    'durationDays' in value.bonding &&
    ['7', '14', '30', '60'].includes(String(value.bonding.durationDays))
  );
}

function basisPoints(value: string) {
  if (!validPercent(value))
    throw new Error(
      'Enter allocations from 0% to 100%, with up to 2 decimal places.',
    );
  const [whole, fraction = ''] = value.trim().split('.');
  return Number(BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')));
}

function monthsToSeconds(value: string) {
  if (!validNonNegativeInteger(value))
    throw new Error('Team vesting must use whole months, starting at 0.');
  const seconds = BigInt(value.trim()) * MONTH_SECONDS;
  if (seconds > MAX_U64)
    throw new Error('Team vesting exceeds the contract duration limit.');
  return seconds.toString();
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
  nowSeconds = Math.floor(Date.now() / 1000),
): LaunchParams {
  if (draft.method !== 'bonding')
    throw new Error('Only bonding-curve launches are connected.');
  requireCreator(owner);
  const token = validateInput({
    name: draft.name,
    code: draft.symbol,
    amount: draft.supply,
  });
  const totalSupplyStroops = toUnits(token.amount);
  const poolBps = basisPoints(draft.allocation.poolShare);
  const curveBps = basisPoints(draft.allocation.saleShare);
  const teamBps = basisPoints(draft.allocation.teamShare);
  if (poolBps + curveBps + teamBps !== 10_000 || poolBps <= 0 || curveBps <= 0)
    throw new Error(
      'Allocations must total 100%, with positive pool and bonding-curve shares.',
    );
  const curveInventory =
    (totalSupplyStroops * BigInt(curveBps)) / BigInt(10_000);
  if (curveInventory <= BigInt(0))
    throw new Error(
      'The bonding-curve allocation must contain at least one stroop.',
    );
  if (!draft.description.trim())
    throw new Error('Enter a project description.');
  const durationSeconds = monthsToSeconds(draft.allocation.vestingMonths);
  if (teamBps > 0 && durationSeconds === '0')
    throw new Error('Enter a positive team vesting duration.');
  const startsAt = draft.bonding.startsAt
    ? unixSeconds(draft.bonding.startsAt)
    : nowSeconds + 60;
  const endsAt = draft.bonding.endsAt
    ? unixSeconds(draft.bonding.endsAt)
    : startsAt + Number(draft.bonding.durationDays) * 86_400;
  if (
    startsAt <= nowSeconds ||
    !Number.isSafeInteger(endsAt) ||
    endsAt <= startsAt
  )
    throw new Error('Choose a future start and an end after the start.');

  return {
    owner,
    asset: assetFor(token.code, issuer).contractId(NETWORK),
    pair: PAIR_SACS[draft.quote],
    metadata: {
      name: token.name,
      description: draft.description,
      logo: 'https://example.com/logo.png', // needs a field — hosted logo URL; temporary fallback authorized for the uploaded image.
      symbol: token.code,
    },
    allocations: { pool_bps: poolBps, curve_bps: curveBps, team_bps: teamBps },
    vesting: {
      cliff_seconds: monthsToSeconds(draft.allocation.cliffMonths),
      duration_seconds: durationSeconds,
      schedule: { tag: 'Weekly' }, // needs a field — unlock schedule; allowed: Daily, Weekly, Monthly.
    },
    curve: {
      virtual_base_reserve: (curveInventory * BigInt(3)).toString(), // needs a field — virtual base reserve in stroops.
      virtual_quote_reserve: (curveInventory * BigInt(3)).toString(), // needs a field — virtual quote reserve in pair stroops.
      graduation_target: toUnits(
        validateAmount(draft.bonding.target),
      ).toString(),
      creator_fee_bps: draft.bonding.creatorFee ? 10 : 0,
      creator_payout_bps: 1000, // needs a field — creator payout; together with the 100 bps platform fee, at most 10000.
    },
    starts_at: String(startsAt),
    ends_at: String(endsAt),
  };
}
