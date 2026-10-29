import { encodeFunctionData, isAddress, type ContractFunctionArgs } from 'viem';
import { factoryAbi } from './factoryAbi';
import { sameEvmAddress } from './wallet';
import { MAX_BASE_AMOUNT } from './amount';
export type BaseLaunchParams = ContractFunctionArgs<typeof factoryAbi, 'nonpayable', 'create_bonding_curve'>[0];
import { baseMetadataError } from './metadata';
export { baseMetadataError, baseUtf8Length } from './metadata';
/** Validates the exact supplied ABI tuple. Execution still requires simulation and verified token bytecode. */
export function encodeBaseCreation(params: BaseLaunchParams, review: {
  caller: string; pair: string; symbol: string; reviewedDeposit: bigint; currentBalance: bigint; platformFeeBps: number;
}) {
  if (![params.owner, params.asset, params.pair].every(value => isAddress(value)) || !sameEvmAddress(params.owner, review.caller) ||
    !sameEvmAddress(params.pair, review.pair) || sameEvmAddress(params.asset, params.pair)) throw new Error('Creation owner, asset or pair does not match the reviewed deployment.');
  if (review.reviewedDeposit <= BigInt(0) || review.reviewedDeposit > MAX_BASE_AMOUNT || review.currentBalance !== review.reviewedDeposit)
    throw new Error('The entire current owner balance must equal the reviewed deposit.');
  for (const field of ['name', 'symbol', 'description', 'logo'] as const) {
    const error = baseMetadataError(params.metadata[field], field); if (error) throw new Error(error);
  }
  if (params.metadata.symbol !== review.symbol) throw new Error('Asset symbol does not match contract metadata.');
  const a = params.allocations, c = params.curve, v = params.vesting;
  if (![a.pool_bps, a.curve_bps, a.team_bps, c.creator_fee_bps, c.creator_payout_bps, review.platformFeeBps].every(Number.isInteger) ||
    a.pool_bps <= 0 || a.curve_bps <= 0 || a.team_bps < 0 || a.pool_bps + a.curve_bps + a.team_bps !== 10000 ||
    c.creator_fee_bps < 0 || c.creator_fee_bps > 1000 || review.platformFeeBps < 0 || review.platformFeeBps > 1000 ||
    c.creator_payout_bps < 0 || c.creator_payout_bps + review.platformFeeBps >= 10000) throw new Error('Invalid allocations or contract fees.');
  if ([c.virtual_base_reserve, c.virtual_quote_reserve, c.graduation_target].some(value => value <= BigInt(0) || value > MAX_BASE_AMOUNT)) throw new Error('Reserves and target must fit uint128.');
  const inventory = review.reviewedDeposit * BigInt(a.curve_bps) / BigInt(10000);
  const team = review.reviewedDeposit * BigInt(a.team_bps) / BigInt(10000);
  const pool = review.reviewedDeposit - inventory - team;
  const maxCost = c.virtual_base_reserve > inventory ? (c.virtual_quote_reserve * inventory + c.virtual_base_reserve - inventory - BigInt(1)) / (c.virtual_base_reserve - inventory) : BigInt(0);
  if (pool <= BigInt(0) || (a.team_bps > 0 && team <= BigInt(0)) || maxCost > MAX_BASE_AMOUNT || inventory <= BigInt(0) || c.virtual_base_reserve <= inventory ||
    (c.virtual_quote_reserve * inventory + c.virtual_base_reserve - inventory - BigInt(1)) / (c.virtual_base_reserve - inventory) < c.graduation_target)
    throw new Error('Curve funding cannot reach the graduation target.');
  const maxTime = (BigInt(1) << BigInt(64)) - BigInt(1);
  if ((v.duration_seconds === BigInt(0) && v.cliff_seconds !== BigInt(0)) || params.starts_at + v.cliff_seconds + v.duration_seconds > maxTime || ![0, 1, 2].includes(v.schedule) || [v.cliff_seconds, v.duration_seconds, params.starts_at].some(value => value < BigInt(0) || value > maxTime)) throw new Error('Invalid vesting or timestamp bounds.');
  // Encoding always uses the artifact's own tuple order and widths; no reputation/correlation fields.
  return encodeFunctionData({ abi: factoryAbi, functionName: 'create_bonding_curve', args: [params] });
}
