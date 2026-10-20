import { numberValue, validPercent, validSupply, type LaunchDraft } from './launch-draft';

export function calculateLaunch(totalSupply: number, creatorPayout: number, creatorTaxBps: number, teamBps: number) {
  const TARGET_PRICE_MULTIPLIER = 10;
  const BPS = 10_000;
  const platformFeeBps = 100;
  const minTarget = 5_000;
  const maxCreatorPayoutBps = 1_000;
  const preferredPriceRatio = Math.sqrt(TARGET_PRICE_MULTIPLIER);
  if (!Number.isFinite(TARGET_PRICE_MULTIPLIER) || TARGET_PRICE_MULTIPLIER <= 1)
    throw new Error('Price multiplier must be greater than 1.');
  if (!Number.isFinite(totalSupply) || totalSupply <= 0 ||
    !Number.isFinite(creatorPayout) || creatorPayout < 0 ||
    !Number.isInteger(creatorTaxBps) || creatorTaxBps < 0 || creatorTaxBps > 1_000 ||
    !Number.isInteger(teamBps) || teamBps < 0 || teamBps >= BPS)
    throw new Error('Invalid supply, payout, tax, or team allocation.');
  const creatorPayoutBps = Math.min(maxCreatorPayoutBps, Math.floor(creatorPayout * (BPS / minTarget)));
  if (creatorPayout > 0 && creatorPayoutBps === 0)
    throw new Error('Creator raise must be zero or at least $0.50.');
  const graduationTarget = creatorPayout === 0 ? minTarget : creatorPayout * (BPS / creatorPayoutBps);
  if (!Number.isFinite(graduationTarget)) throw new Error('Payout is too large.');
  const poolShare = 1 - (creatorPayoutBps + platformFeeBps) / BPS;
  const poolBps = Math.round((BPS - teamBps) * poolShare / (preferredPriceRatio + poolShare));
  const curveBps = BPS - teamBps - poolBps;
  const curveTokens = totalSupply * (curveBps / BPS);
  const teamTokens = totalSupply * (teamBps / BPS);
  const poolTokens = totalSupply - curveTokens - teamTokens;
  const platformRevenue = graduationTarget * (platformFeeBps / BPS);
  const poolQuote = graduationTarget - creatorPayout - platformRevenue;
  const r = (poolQuote / graduationTarget) * (curveTokens / poolTokens);
  if (poolBps <= 0 || curveBps <= 0 || !Number.isFinite(r) || r <= 1)
    throw new Error('Team allocation leaves too little usable liquidity.');
  const virtualBaseReserve = curveTokens * (r / (r - 1));
  const virtualQuoteReserve = graduationTarget / (r - 1);
  const remaining = virtualBaseReserve - curveTokens;
  const graduationPrice = (virtualQuoteReserve / remaining) * (virtualBaseReserve / remaining);
  const poolPrice = poolQuote / poolTokens;
  if (![virtualBaseReserve, virtualQuoteReserve, graduationPrice, poolPrice].every(x => Number.isFinite(x) && x > 0))
    throw new Error('Inputs exceed supported preview precision.');
  const startPrice = virtualQuoteReserve / virtualBaseReserve;
  return {
    totalSupply, creatorPayout, creatorPayoutBps, creatorTaxBps, teamBps, platformFeeBps, graduationTarget,
    allocations: { team_bps: teamBps, curve_bps: curveBps, pool_bps: poolBps },
    teamTokens, curveTokens, poolTokens, poolQuote, platformRevenue,
    virtualBaseReserve, virtualQuoteReserve, startPrice, graduationPrice, poolPrice,
    targetPriceMultiplier: TARGET_PRICE_MULTIPLIER,
    actualPriceMultiplier: graduationPrice / startPrice,
    buyOnlyCreatorTaxEstimate: graduationTarget * (creatorTaxBps / BPS),
    buyOnlyBuyerSpendEstimate: graduationTarget * (1 + creatorTaxBps / BPS),
  };
}

const UNIT = BigInt(10_000_000);
const BPS = BigInt(10_000);
const MAX_AMOUNT = BigInt('9223372036854775807');
const ceilDivide = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b;

function units(value: string) {
  const [whole, fraction = ''] = value.trim().split('.');
  return BigInt(whole) * UNIT + BigInt(fraction.padEnd(7, '0'));
}

/** Preview uses the supplied formula; deployment retains exact seven-decimal amounts. */
export function calculateDraftLaunch(draft: LaunchDraft) {
  if (!validSupply(draft.supply)) throw new Error('Enter a valid total supply with up to 7 decimal places.');
  if (!/^\d+(?:\.\d{1,7})?$/.test(draft.bonding.creatorPayout.trim()))
    throw new Error('Enter a creator raise of $0 or at least $0.50, with up to 7 decimal places.');
  if (!validPercent(draft.bonding.creatorFee) || numberValue(draft.bonding.creatorFee) > 10)
    throw new Error('Creator tax must be 0–10%, with up to 2 decimal places.');
  if (!validPercent(draft.allocation.teamShare) || numberValue(draft.allocation.teamShare) >= 100)
    throw new Error('Team allocation must be 0–99.99%, with up to 2 decimal places.');
  const result = calculateLaunch(numberValue(draft.supply), numberValue(draft.bonding.creatorPayout),
    Math.round(numberValue(draft.bonding.creatorFee) * 100), Math.round(numberValue(draft.allocation.teamShare) * 100));
  const supply = units(draft.supply);
  const payout = units(draft.bonding.creatorPayout);
  const inventory = supply * BigInt(result.allocations.curve_bps) / BPS;
  const team = supply * BigInt(result.teamBps) / BPS;
  const pool = supply - inventory - team;
  const target = payout === BigInt(0) ? BigInt(5_000) * UNIT : ceilDivide(payout * BPS, BigInt(result.creatorPayoutBps));
  const numerator = (BPS - BigInt(result.creatorPayoutBps + result.platformFeeBps)) * inventory;
  const denominator = BPS * pool;
  if (inventory <= BigInt(0) || pool <= BigInt(0) || numerator <= denominator)
    throw new Error('Supply or team allocation leaves too little usable liquidity.');
  const base = ceilDivide(inventory * numerator, numerator - denominator);
  // Round up so the cumulative curve cost can reach graduation before inventory runs out.
  const quote = ceilDivide(target * (base - inventory), inventory);
  if ([base, quote, target].some(value => value <= BigInt(0) || value > MAX_AMOUNT))
    throw new Error('Curve reserves exceed the contract amount limit. Reduce supply or creator raise.');
  const deployedStartPrice = Number(quote) / Number(base);
  const deployedGraduationPrice = Number(quote) * Number(base) / Number(base - inventory) ** 2;
  // Reject tiny supplies when atomic-unit rounding exceeds one basis point of preview precision.
  if (Math.abs(deployedStartPrice / result.startPrice - 1) > 1 / 10_000 ||
    Math.abs(deployedGraduationPrice / result.graduationPrice - 1) > 1 / 10_000)
    throw new Error('Inputs exceed supported deployment precision. Increase total supply.');
  return { ...result, tokenUnits: { curve: inventory.toString(), team: team.toString(), pool: pool.toString() }, contract: {
    virtual_base_reserve: base.toString(), virtual_quote_reserve: quote.toString(), graduation_target: target.toString(),
  } };
}

export function launchPreview(draft: LaunchDraft) {
  try {
    return { calculation: calculateDraftLaunch(draft), error: null };
  } catch (cause) {
    return { calculation: null, error: cause instanceof Error ? cause.message : 'Unable to calculate launch.' };
  }
}

export function calculatedAllocation(draft: LaunchDraft) {
  if (draft.method !== 'bonding') return draft.allocation;
  const { calculation } = launchPreview(draft);
  return { ...draft.allocation,
    saleShare: calculation ? String(calculation.allocations.curve_bps / 100) : '',
    poolShare: calculation ? String(calculation.allocations.pool_bps / 100) : '',
  };
}

export function formatLaunchNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 7 }).format(value);
}

export function formatLaunchPrice(value: number) {
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 7 }).format(value);
}

export function formatLaunchUnits(value: string) {
  const amount = BigInt(value);
  const fraction = (amount % UNIT).toString().padStart(7, '0').replace(/0+$/, '');
  return `${(amount / UNIT).toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
}
