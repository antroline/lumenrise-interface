import type { Snapshot } from './contract';
/** Invert the contract's cumulative cost and rounded creator fee in exact units. */
export function buyAmountForBudget(snapshot: Snapshot, budget: bigint): bigint {
  const {
    virtual_base_reserve: base,
    virtual_quote_reserve: quote,
    creator_fee_bps: feeBps,
  } = snapshot.config.params.curve;
  const { sold } = snapshot.state;
  const capacity = snapshot.config.buckets.curve;
  if (
    budget <= BigInt(0) ||
    sold < BigInt(0) ||
    sold >= capacity ||
    base <= capacity ||
    quote <= BigInt(0) ||
    feeBps < BigInt(0) ||
    feeBps > BigInt(10_000)
  )
    return BigInt(0);
  const costBefore = (quote * sold + base - sold - BigInt(1)) / (base - sold);
  let low = BigInt(0),
    high = capacity - sold;
  // Find the largest fill whose gross + ceil(creator fee) fits the entered payment.
  while (low < high) {
    const amount = (low + high + BigInt(1)) / BigInt(2);
    const nextSold = sold + amount;
    const remaining = base - nextSold;
    const gross =
      (quote * nextSold + remaining - BigInt(1)) / remaining - costBefore;
    const fee = (gross * feeBps + BigInt(9_999)) / BigInt(10_000);
    if (gross + fee <= budget) low = amount;
    else high = amount - BigInt(1);
  }
  return low;
}
