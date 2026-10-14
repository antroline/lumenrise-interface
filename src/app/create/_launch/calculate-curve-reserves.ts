/**
 * Contract cumulative cost: ceil(Q * sold / (B - sold)).
 * B = 2 * inventory and Q = target raise exactly target at full inventory.
 * Marginal price starts at target/(2*inventory) and ends four times higher.
 * All amounts use the existing seven-decimal on-chain units; fees are separate.
 */
export function calculateCurveReserves(inventory: bigint, target: bigint) {
  if (inventory <= BigInt(0) || target <= BigInt(0))
    throw new Error('Curve inventory and graduation target must be positive.');
  const base = inventory * BigInt(2);
  // Factory validates both virtual reserves against the Stellar i64 amount limit.
  const maxReserve = BigInt('9223372036854775807');
  if (base > maxReserve || target > maxReserve)
    throw new Error(
      'Curve reserves exceed the contract amount limit. Reduce supply or graduation target.',
    );
  return {
    virtual_base_reserve: base.toString(),
    virtual_quote_reserve: target.toString(),
    graduation_target: target.toString(),
  };
}
