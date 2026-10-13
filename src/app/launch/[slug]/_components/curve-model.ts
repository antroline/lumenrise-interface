import { UNIT } from '../_bonding/contract';

export type CurveModelInput = {
  base: bigint;
  quote: bigint;
  capacity: bigint;
  sold: bigint;
  target: bigint;
};
const ceil = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - BigInt(1)) / denominator;

/** Visualization only. Matches launchpad-types cumulative_cost/current_price; never used for transactions. */
export function modelPrice(base: bigint, quote: bigint, sold: bigint) {
  const remaining = base - sold;
  return ceil(quote * base * UNIT, remaining * remaining);
}
export function modelReserves(base: bigint, quote: bigint, sold: bigint) {
  return ceil(quote * sold, base - sold);
}
export function curveModel(input: CurveModelInput) {
  const { base, quote, capacity, sold, target } = input;
  if (
    base <= capacity ||
    capacity <= BigInt(0) ||
    quote <= BigInt(0) ||
    sold < BigInt(0) ||
    sold > capacity ||
    target <= BigInt(0)
  )
    return null;
  let graduation: bigint | null = null;
  if (modelReserves(base, quote, capacity) >= target) {
    let low = BigInt(0),
      high = capacity;
    while (low < high) {
      const middle = (low + high) / BigInt(2);
      if (modelReserves(base, quote, middle) >= target) high = middle;
      else low = middle + BigInt(1);
    }
    graduation = low;
  }
  const focus =
    graduation !== null && graduation > sold
      ? graduation
      : sold > BigInt(0)
        ? sold
        : capacity;
  const end =
    (focus * BigInt(6)) / BigInt(5) < capacity
      ? (focus * BigInt(6)) / BigInt(5)
      : capacity;
  const points = Array.from({ length: 81 }, (_, index) => {
    const quantity = (end * BigInt(index)) / BigInt(80);
    return { sold: quantity, price: modelPrice(base, quote, quantity) };
  });
  return {
    points,
    end,
    graduation,
    currentModelPrice: modelPrice(base, quote, sold),
  };
}

/** Normalize only the SVG coordinate, keeping raw amount/price arithmetic exact. */
export function plotRatio(value: bigint, min: bigint, max: bigint) {
  return max === min
    ? 0
    : Number(((value - min) * BigInt(1_000_000)) / (max - min)) / 1_000_000;
}
