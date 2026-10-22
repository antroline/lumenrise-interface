/** Keep decimal labels, abbreviating only long values on narrow charts. */
export function formatPriceAxis(value: number, compact = false) {
  const label = value.toLocaleString('en-US', {
    notation: 'standard',
    maximumSignificantDigits: compact ? 3 : 6,
  });
  return compact && label.length > 10 ? value.toExponential(2) : label;
}

/** Preserve every indexed digit in the tooltip, independently of SVG precision. */
export function formatExactPrice(raw: string, scale: number) {
  const digits = raw.padStart(scale + 1, '0');
  if (scale === 0) return digits;
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return digits.slice(0, -scale) + (fraction ? `.${fraction}` : '');
}

export function priceDomain(prices: number[]): [number, number] {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Proportional padding works at every token magnitude; flat series stay flat.
  const padding = Math.max((max - min) * 0.12, Math.abs(max) * 0.02) || 1;
  return [Math.max(0, min - padding), max + padding];
}

export function formatPriceTime(time: number, intraday: boolean) {
  return new Date(time).toLocaleString('en-US', {
    timeZone: 'UTC',
    ...(intraday
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { month: 'short', day: 'numeric' }),
  });
}
