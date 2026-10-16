import { Asset, Networks } from '@stellar/stellar-sdk';
import { formatAmount } from '@/lib/stellar/amount';
import type { ApiNetwork } from './types';
import type { ChartHistory } from './market';

export function roundAmount(raw: string, maxDecimals: number) {
  // Round to the requested precision with exact integer arithmetic.
  const units = BigInt(raw);
  const keep = BigInt(10 ** (7 - maxDecimals));
  return (((units + keep / BigInt(2)) / keep) * keep).toString();
}

export function displayAmount(
  raw: string | null | undefined,
  maxDecimals?: number,
) {
  if (raw == null) return '—';
  if (maxDecimals === undefined) return formatAmount(BigInt(raw));
  return formatAmount(BigInt(roundAmount(raw, maxDecimals)));
}
/** Formats seven-decimal token units with up to two decimals and K/M/B/T suffixes. */
export function compactAmount(raw: string | null | undefined): string {
  if (raw == null) return '—';
  const amount = BigInt(raw);
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let divisor = BigInt(10_000_000);
  let index = 0;
  let hundredths = (absolute * BigInt(100) + divisor / BigInt(2)) / divisor;
  while (hundredths >= BigInt(100_000) && index < suffixes.length - 1) {
    divisor *= BigInt(1000);
    index += 1;
    hundredths = (absolute * BigInt(100) + divisor / BigInt(2)) / divisor;
  }
  const integer = (hundredths / BigInt(100)).toString();
  const fraction = (hundredths % BigInt(100))
    .toString()
    .padStart(2, '0')
    .replace(/0+$/, '');
  const sign = negative && hundredths > BigInt(0) ? '-' : '';
  return sign + integer + (fraction ? '.' + fraction : '') + suffixes[index];
}

export function pairLabel(pair: string | undefined, network: ApiNetwork) {
  if (!pair) return 'Pair token';
  if (
    network === 'testnet' &&
    pair === 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
  )
    return 'USDC';
  if (
    pair ===
    Asset.native().contractId(
      network === 'public' ? Networks.PUBLIC : Networks.TESTNET,
    )
  )
    return 'XLM';
  return `${pair.slice(0, 4)}…${pair.slice(-4)}`;
}
export function unixDate(seconds: string | undefined) {
  if (!seconds) return '—';
  const raw = BigInt(seconds) * BigInt(1000);
  if (raw > BigInt(8_640_000_000_000_000)) return '—';
  return (
    new Date(Number(raw)).toLocaleString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  );
}
/** Conversion to floating point happens only at the SVG boundary. */
export function chartNumber(raw: string, scale: number): number {
  const integer = BigInt(raw);
  const digits = integer.toString().padStart(scale + 1, '0');
  const decimal = scale === 7 ? formatAmount(integer)
    : scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  const value = Number(decimal);
  if (!Number.isFinite(value) || (integer !== BigInt(0) && value === 0))
    throw new Error('This price cannot be displayed accurately.');
  return value;
}
export function chartPoints(chart: ChartHistory) {
  const candles = new Map<number, (typeof chart.items)[number]>();
  for (const candle of chart.items) candles.set(Date.parse(candle.timestamp), candle);
  return [...candles.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, candle]) => ({
      time,
      price: chartNumber(candle.close ?? candle.latestPrice, chart.priceScale),
    }));
}

/** Keep overlapping UTC candles in the data while displaying the selected window. */
export function chartWindow(chart: ChartHistory): [number, number] | undefined {
  if (!chart.items.length) return undefined;
  const first = Math.min(...chart.items.map((item) => Date.parse(item.timestamp)));
  const observed = chart.firstObservationAt ? Date.parse(chart.firstObservationAt) : first;
  return [chart.from ? Math.max(Date.parse(chart.from), observed) : first, Date.parse(chart.asOf)];
}
