
export type CurveModelInput = {
  assetDecimals?: number;
  base: bigint;
  quote: bigint;
  capacity: bigint;
  sold: bigint;
  target: bigint;
};
const ceil = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - BigInt(1)) / denominator;

/** Visualization only. Matches launchpad-types cumulative_cost/current_price; never used for transactions. */
export function modelPrice(base: bigint, quote: bigint, sold: bigint, assetDecimals = 7) {
  const remaining = base - sold;
  return ceil(quote * base * (BigInt(10) ** BigInt(assetDecimals)), remaining * remaining);
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
    return { sold: quantity, price: modelPrice(base, quote, quantity, input.assetDecimals) };
  });
  return {
    points,
    end,
    graduation,
    currentModelPrice: modelPrice(base, quote, sold, input.assetDecimals),
  };
}

/**
 * Drawing geometry for the configured curve, normalised to 0–1 on both axes (y = 0 at the bottom).
 * Price is proportional to (base / (base − sold))², so the shape is drawn from that ratio; the area
 * under it up to a point equals the quote raised by then. Visualization only.
 */
export function curveShape(input: CurveModelInput, samples = 96) {
  const model = curveModel(input);
  if (!model || model.end <= BigInt(0)) return null;
  const base = Number(input.base);
  const end = Number(model.end);
  const ratio = (sold: number) => (base / (base - sold)) ** 2;
  const ceiling = ratio(end) * 1.14;
  const height = (sold: number) => ratio(sold) / ceiling;
  const clamp = (value: number) => Math.max(0, Math.min(value, 1));
  const sold = clamp(Number(input.sold) / end);
  return {
    points: Array.from({ length: samples + 1 }, (_, index) => ({
      x: index / samples,
      y: height((end * index) / samples),
    })),
    sold,
    soldHeight: height(sold * end),
    graduation:
      model.graduation === null ? null : clamp(Number(model.graduation) / end),
    end: model.end,
  };
}

/** Normalize only the SVG coordinate, keeping raw amount/price arithmetic exact. */
export function plotRatio(value: bigint, min: bigint, max: bigint) {
  return max === min
    ? 0
    : Number(((value - min) * BigInt(1_000_000)) / (max - min)) / 1_000_000;
}
