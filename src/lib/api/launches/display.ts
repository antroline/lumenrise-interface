import { getConfiguration } from '../config';
import { Asset } from '@stellar/stellar-sdk';
import { formatAmount } from '@/lib/stellar/amount';
import { getApiChain } from '../client';
import type { LaunchResult } from './market';
export const assetScale = (launch?: Pick<LaunchResult, 'assetDecimals'> & { amountScale?: number }): number | null => getApiChain() === 'base' ? launch?.assetDecimals ?? launch?.amountScale ?? null : 7;
export const pairScale = (launch?: Pick<LaunchResult, 'pairDecimals'>): number | null => getApiChain() === 'base' ? launch?.pairDecimals ?? null : 7;
import type { ApiNetwork } from './types';
import type { ChartHistory } from './market';
import { USDC_CONTRACTS } from '../../stellar/payment-assets';

export function roundAmount(raw: string, maxDecimals: number, scale = 7) {
  // Round to the requested precision with exact integer arithmetic.
  const units = BigInt(raw);
  const keep = BigInt(10) ** BigInt(Math.max(0, scale - maxDecimals));
  return (((units + keep / BigInt(2)) / keep) * keep).toString();
}

export function displayAmount(
  raw: string | null | undefined,
  maxDecimals?: number,
  scale: number | null = 7,
) {
  if (raw == null || scale === null) return '—';
  const units = maxDecimals === undefined ? raw : roundAmount(raw, maxDecimals, scale);
  const value = BigInt(units), negative = value < BigInt(0), absolute = negative ? -value : value;
  const divisor = BigInt(10) ** BigInt(scale);
  const fraction = scale === 0 ? '' : (absolute % divisor).toString().padStart(scale, '0').replace(/0+$/, '');
  return (negative ? '-' : '') + (absolute / divisor).toString() + (fraction ? '.' + fraction : '');
}
/** Formats explicitly scaled token units with up to two decimals and K/M/B/T suffixes. */
export function compactAmount(raw: string | null | undefined, scale: number | null = 7): string {
  if (raw == null || scale === null) return '—';
  const amount = BigInt(raw);
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let divisor = BigInt(10) ** BigInt(scale);
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
  const config = getConfiguration();
  if ('chain' in config) {
    if (network === 'testnet' && pair.toLowerCase() === '0x1670503bc03d1d5a0ca14a07c005cf48e2d27f15') return 'USDC';
    return `${pair.slice(0, 6)}…${pair.slice(-4)}`;
  }
  if (pair === USDC_CONTRACTS[network])
    return 'USDC';
  if (
    pair ===
    Asset.native().contractId(
      config.network.configurations[network].networkPassphrase,
    )
  )
    return 'XLM';
  return `${pair.slice(0, 4)}…${pair.slice(-4)}`;
}
export function unixDate(seconds: string | null | undefined) {
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
