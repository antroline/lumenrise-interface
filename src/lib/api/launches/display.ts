import { Asset, Networks } from '@stellar/stellar-sdk';
import { formatAmount } from '@/app/launch/[slug]/_bonding/contract';
import type { ApiNetwork } from './types';
import type { ChartResult, ChartRange } from './market';

export function displayAmount(raw: string | null | undefined) {
  return raw == null ? '—' : formatAmount(BigInt(raw));
}
export function pairLabel(pair: string | undefined, network: ApiNetwork) {
  if (!pair) return 'Pair token';
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
  if (integer > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('These prices exceed the chart’s supported precision.');
  const value = Number(integer) / 10 ** scale;
  if (!Number.isFinite(value) || (integer !== BigInt(0) && value === 0))
    throw new Error('This price cannot be displayed accurately.');
  return value;
}
const durations: Record<Exclude<ChartRange, 'ALL'>, number> = {
  '1D': 86400,
  '1W': 7 * 86400,
  '1M': 30 * 86400,
  '3M': 90 * 86400,
};
export function chartPoints(chart: ChartResult, now = Date.now()) {
  const observations = [...chart.items].sort(
    (a, b) => Date.parse(a.lastObservedAt) - Date.parse(b.lastObservedAt),
  );
  const end = Math.max(
    now,
    ...observations.map((i) => Date.parse(i.lastObservedAt)),
  );
  const start =
    chart.range === 'ALL'
      ? chart.firstObservationAt
        ? Date.parse(chart.firstObservationAt)
        : observations.length
          ? Date.parse(observations[0].timestamp)
          : end - chart.intervalSeconds * 1000
      : end - durations[chart.range] * 1000;
  const points: { time: number; price: number }[] = [];
  if (chart.previousPrice !== null)
    points.push({
      time: start,
      price: chartNumber(chart.previousPrice, chart.priceScale),
    });
  for (const item of observations)
    points.push({
      time: Date.parse(item.lastObservedAt),
      price: chartNumber(item.close, chart.priceScale),
    });
  if (points.length && end > points[points.length - 1].time)
    points.push({
      time: end,
      price: points[points.length - 1].price,
    });
  return points;
}
