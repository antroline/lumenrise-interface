import { decodeEventLog, encodeAbiParameters, keccak256, parseAbi, zeroAddress, type Address, type Hex, type Log } from 'viem';
import { formatBaseAmount, MAX_BASE_AMOUNT, requireBaseTokenDecimals } from './amount';
import { sameEvmAddress } from './wallet';

// Official v4 deployments; router encoding is pinned to Universal Router 2.0.0,
// v4-periphery commit 444c526b77d804590f0d7bc5a481af5a3277c952.
// https://developers.uniswap.org/docs/protocols/v4/deployments
export const V4_DEPLOYMENTS = {
  8453: { manager: '0x498581ff718922c3f8e6a244956af099b2652b2b', router: '0x6ff5693b99212da76ad316178a184ab56d299b43', positions: '0x7c5f5a4bbd8fd63184577525326123b519429bdc', stateView: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71', quoter: '0x0d5e0f971ed27fbff6c2837bf31316121532048d' },
  84532: { manager: '0x05e73354cfdd6745c338b50bcfdfa3aa6fa03408', router: '0x492e6456d9528771018deb9e87ef7750ef184104', positions: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80', stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4', quoter: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba' },
} as const;
export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
export const graduationAbi = parseAbi([
  'struct GraduationState { bool settled; bytes32 pool_id; uint256 token_id; uint128 liquidity; uint256 asset_deposited; uint256 pair_deposited; uint256 creator_payout; uint256 platform_fee; uint256 asset_dust; uint256 pair_dust; }',
  'function graduation_state() view returns (GraduationState)',
]);
export const poolKeyComponents = [
  { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
  { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
] as const;
export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
export const v4Abi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }',
  'function poolManager() view returns (address)',
  'function getPoolAndPositionInfo(uint256 tokenId) view returns (PoolKey poolKey, uint256 info)',
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
  'function quoteExactInputSingle(QuoteExactSingleParams params) returns (uint256 amountOut, uint256 gasEstimate)',
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)',
]);
export const permit2Abi = parseAbi([
  'function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)',
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
]);
export function poolId(key: PoolKey): Hex {
  return keccak256(encodeAbiParameters([{ type: 'tuple', components: poolKeyComponents }], [key]));
}
export function verifyPool(key: PoolKey, id: Hex, asset: Address, pair: Address) {
  if (key.hooks !== zeroAddress || key.fee >= 1_000_000 || key.tickSpacing <= 0 ||
    BigInt(key.currency0) >= BigInt(key.currency1) || poolId(key).toLowerCase() !== id.toLowerCase() ||
    !((sameEvmAddress(key.currency0, asset) && sameEvmAddress(key.currency1, pair)) ||
      (sameEvmAddress(key.currency1, asset) && sameEvmAddress(key.currency0, pair))))
    throw new Error('The graduated pool does not match this token pair or has unsupported hooks/settings.');
}
/** Pair atomic units per whole asset. Q96 squared is token1/token0 in atomic units. */
export function v4AssetPrice(sqrtPriceX96: bigint, key: PoolKey, asset: Address, assetDecimals: number): bigint {
  requireBaseTokenDecimals(assetDecimals);
  if (sqrtPriceX96 <= BigInt(0)) throw new Error('The pool is not initialized.');
  const squared = sqrtPriceX96 * sqrtPriceX96, q192 = BigInt(1) << BigInt(192);
  const scale = BigInt(10) ** BigInt(assetDecimals);
  return sameEvmAddress(key.currency0, asset) ? squared * scale / q192 : q192 * scale / squared;
}
/** Display ratios before rounding to pair atomic units (prices can be below one atomic unit). */
export function formatV4Price(pairNumerator: bigint, assetDenominator: bigint, assetDecimals: number, pairDecimals: number): string {
  requireBaseTokenDecimals(assetDecimals); requireBaseTokenDecimals(pairDecimals);
  if (pairNumerator <= BigInt(0) || assetDenominator <= BigInt(0)) throw new Error('Invalid price ratio.');
  const scaled = pairNumerator * BigInt(10) ** BigInt(assetDecimals + 12) / (assetDenominator * BigInt(10) ** BigInt(pairDecimals));
  return scaled === BigInt(0) ? '<0.000000000001' : formatBaseAmount(scaled, 12);
}
export function encodeV4Swap(key: PoolKey, input: Address, amount: bigint, minimum: bigint): Hex {
  if (amount <= BigInt(0) || amount > MAX_BASE_AMOUNT || minimum <= BigInt(0) || minimum > MAX_BASE_AMOUNT)
    throw new Error('Swap amounts must fit uint128 and the minimum output must be positive.');
  if (!sameEvmAddress(input, key.currency0) && !sameEvmAddress(input, key.currency1)) throw new Error('Invalid swap input currency.');
  const zeroForOne = sameEvmAddress(input, key.currency0);
  const swap = encodeAbiParameters([{ type: 'tuple', components: [
    { name: 'poolKey', type: 'tuple', components: poolKeyComponents }, { name: 'zeroForOne', type: 'bool' },
    { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' }, { name: 'hookData', type: 'bytes' },
  ] }], [{ poolKey: key, zeroForOne, amountIn: amount, amountOutMinimum: minimum, hookData: '0x' }]);
  const currencyAmount = [{ type: 'address' }, { type: 'uint256' }] as const;
  return encodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }], ['0x060c0f', [swap,
    encodeAbiParameters(currencyAmount, [input, amount]),
    encodeAbiParameters(currencyAmount, [zeroForOne ? key.currency1 : key.currency0, minimum]),
  ]]);
}
export function v4ExecutedAmounts(logs: readonly Pick<Log, 'address' | 'topics' | 'data'>[], manager: Address, router: Address, id: Hex, key: PoolKey, input: Address) {
  let paid = BigInt(0), received = BigInt(0);
  for (const log of logs) {
    if (!sameEvmAddress(log.address, manager)) continue;
    let decoded;
    try { decoded = decodeEventLog({ abi: v4Abi, eventName: 'Swap', data: log.data, topics: log.topics }); }
    catch { continue; }
    const e = decoded.args;
    if (e.id.toLowerCase() !== id.toLowerCase() || !sameEvmAddress(e.sender, router)) continue;
    const [a, b] = sameEvmAddress(input, key.currency0) ? [e.amount0, e.amount1] : [e.amount1, e.amount0];
    if (a >= BigInt(0) || b <= BigInt(0)) throw new Error('Unexpected pool swap direction.');
    paid -= a; received += b;
  }
  if (!paid || !received) throw new Error('The transaction mined, but its pool swap could not be verified. Keep the transaction hash.');
  return { paid, received };
}
