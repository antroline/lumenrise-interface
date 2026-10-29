import { getConfiguration } from '../../../lib/api/config';
import { parseBaseAmount, MAX_BASE_AMOUNT } from '../../../lib/base/amount';
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
  if ('chain' in getConfiguration()) return calculateBaseDraftPreview(draft);
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
  return { ...result, assetDecimals: 7, tokenUnits: { curve: inventory.toString(), team: team.toString(), pool: pool.toString() }, contract: {
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

export function formatLaunchUnits(value: string, decimals = 7) {
  const amount = BigInt(value), unit = BigInt(10) ** BigInt(decimals);
  const fraction = (amount % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${(amount / unit).toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
}

/** Draft-only projections. Exact arithmetic uses a dimensionless USD scale, never guessed pair base units. */
function calculateBaseDraftPreview(draft: LaunchDraft) {
  const unit = BigInt(10) ** BigInt(18), bpsUnit = BigInt(10000);
  const supply = parseBaseAmount(draft.supply, 18);
  if (supply > MAX_BASE_AMOUNT) throw new Error('Supply exceeds uint128.');
  const payout = /^0(?:\.0+)?$/.test(draft.bonding.creatorPayout.trim()) ? BigInt(0) : parseBaseAmount(draft.bonding.creatorPayout, 18);
  const percent = (text: string) => {
    if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text.trim())) throw new Error('Use a percentage with up to 2 decimal places.');
    const [whole, fraction = ''] = text.trim().split('.');
    return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
  };
  const taxBps = percent(draft.bonding.creatorFee), teamBps = percent(draft.allocation.teamShare);
  if (taxBps > BigInt(1000) || teamBps >= bpsUnit) throw new Error('Invalid creator tax or team allocation.');
  const payoutBps = payout * bpsUnit / (BigInt(5000) * unit) > BigInt(1000) ? BigInt(1000) : payout * bpsUnit / (BigInt(5000) * unit);
  if (payout > BigInt(0) && payoutBps === BigInt(0)) throw new Error('Creator raise must be zero or at least $0.50.');
  const target = payout === BigInt(0) ? BigInt(5000) * unit : ceilDivide(payout * bpsUnit, payoutBps);
  // Creation verifies the factory fee and converts these exact economics using live pair decimals.
  const platformBps = BigInt(100), remainingShare = bpsUnit - payoutBps - platformBps;
  const ratio = BigInt('3162277660168379331'); // floor(sqrt(10) * 10^18)
  const denominator = bpsUnit * ratio + remainingShare * unit;
  const poolBps = ((bpsUnit - teamBps) * remainingShare * unit + denominator / BigInt(2)) / denominator;
  const curveBps = bpsUnit - teamBps - poolBps;
  const inventory = supply * curveBps / bpsUnit, team = supply * teamBps / bpsUnit, pool = supply - inventory - team;
  const numerator = remainingShare * inventory, divisor = bpsUnit * pool;
  if (poolBps <= BigInt(0) || inventory <= BigInt(0) || pool <= BigInt(0) || numerator <= divisor) throw new Error('Supply or team allocation leaves too little usable liquidity.');
  const base = ceilDivide(inventory * numerator, numerator - divisor), quote = ceilDivide(target * (base - inventory), inventory);
  if (base > MAX_BASE_AMOUNT) throw new Error('Curve reserve exceeds uint128.');
  const startPrice = ceilDivide(quote * unit, base), graduationPrice = ceilDivide(quote * base * unit, (base - inventory) ** BigInt(2));
  const revenue = target * platformBps / bpsUnit, poolQuote = target - payout - revenue;
  // Finite rendering projections only. No projection is ever used for encoding, comparisons, or signing.
  const project = (raw: bigint) => Number(raw) / 1e18;
  return {
    baseExact: { graduationTarget: target, virtualQuoteReserve: quote },
    assetDecimals: 18, totalSupply: project(supply), creatorPayout: project(payout), creatorPayoutBps: Number(payoutBps), creatorTaxBps: Number(taxBps), teamBps: Number(teamBps), platformFeeBps: 100,
    graduationTarget: project(target), allocations: { team_bps: Number(teamBps), curve_bps: Number(curveBps), pool_bps: Number(poolBps) },
    teamTokens: project(team), curveTokens: project(inventory), poolTokens: project(pool), poolQuote: project(poolQuote), platformRevenue: project(revenue),
    virtualBaseReserve: project(base), virtualQuoteReserve: project(quote), startPrice: project(startPrice), graduationPrice: project(graduationPrice),
    poolPrice: project(ceilDivide(poolQuote * unit, pool)), targetPriceMultiplier: 10, actualPriceMultiplier: Number(graduationPrice * unit / startPrice) / 1e18,
    buyOnlyCreatorTaxEstimate: project(target * taxBps / bpsUnit), buyOnlyBuyerSpendEstimate: project(target * (bpsUnit + taxBps) / bpsUnit),
    tokenUnits: { curve: inventory.toString(), team: team.toString(), pool: pool.toString() },
    contract: { virtual_base_reserve: base.toString(), virtual_quote_reserve: 'Unavailable until pair decimals are verified', graduation_target: 'Unavailable until pair decimals are verified' },
  };
}
