import { apiRequest } from '@/lib/api/client';
import {
  chartFrom,
  decodeChart,
  type Candle,
  type ChartRange,
  type ChartResult,
} from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';

export const candleTimeframes = [
  '1m',
  '5m',
  '15m',
  '45m',
  '1h',
  '4h',
  '1d',
  '1w',
  '1M',
] as const;
export type CandleTimeframe = (typeof candleTimeframes)[number];
export type CandlePage = {
  result: ChartResult;
  frame: ChartResult['timeframes'][number];
};
export const maxChartCandles = 100000;

/** The legacy shared decoder fixes priceScale at seven. Candles carry their own scale. */
export function decodeCandleResult(value: unknown): ChartResult {
  if (
    !value ||
    typeof value !== 'object' ||
    !('priceScale' in value) ||
    typeof value.priceScale !== 'number' ||
    !Number.isInteger(value.priceScale) ||
    value.priceScale < 0 ||
    value.priceScale > 300
  )
    throw new Error('Invalid candle price scale.');
  const result = decodeChart({ ...value, priceScale: 7 });
  return { ...result, priceScale: value.priceScale };
}

/** Include the whole UTC candle intersecting the requested display boundary. */
export function candleBoundary(
  time: number,
  timeframe: CandleTimeframe,
): number {
  const date = new Date(time);
  if (timeframe === '1M')
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  if (timeframe === '1w') {
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date.getTime();
  }
  const minutes = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '45m': 45,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
  }[timeframe];
  return Math.floor(time / (minutes * 60000)) * minutes * 60000;
}

export function earlierBoundary(
  time: number,
  timeframe: CandleTimeframe,
  bars: number,
): number {
  const start = candleBoundary(time, timeframe);
  const date = new Date(start);
  if (timeframe === '1M') {
    date.setUTCMonth(date.getUTCMonth() - bars);
    return date.getTime();
  }
  if (timeframe === '1w') {
    date.setUTCDate(date.getUTCDate() - bars * 7);
    return date.getTime();
  }
  const duration = start - candleBoundary(start - 1, timeframe);
  return start - bars * duration;
}

export function displayWindow(
  range: ChartRange,
  now: number,
): [number, number] | undefined {
  const from = chartFrom(range, now);
  return from ? [Date.parse(from), now] : undefined;
}

export async function requestCandles(
  slug: string,
  network: ApiNetwork,
  timeframe: CandleTimeframe,
  signal: AbortSignal,
  options: { from?: number; to?: string; limit?: number } = {},
): Promise<CandlePage> {
  const query = new URLSearchParams({
    timeframes: timeframe,
    limit: String(options.limit ?? 1000),
  });
  if (options.from !== undefined)
    query.set(
      'from',
      new Date(candleBoundary(options.from, timeframe)).toISOString(),
    );
  if (options.to)
    query.set(
      'to',
      new Date(Math.min(Date.parse(options.to), Date.now())).toISOString(),
    );
  const result = decodeCandleResult(
    await apiRequest<unknown>(
      `/launches/${encodeURIComponent(slug)}/chart?${query}`,
      { network, signal },
    ),
  );
  signal.throwIfAborted();
  const frame = result.timeframes.find((item) => item.timeframe === timeframe);
  if (result.network !== network || !frame)
    throw new Error('The candle response does not match the selected market.');
  if (frame.hasMore && !frame.nextBefore)
    throw new Error('The server omitted the older-history cursor.');
  frame.items = [
    ...new Map(
      frame.items.map((item) => [Date.parse(item.timestamp), item]),
    ).values(),
  ].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return { result, frame };
}

/** Per-candle snapshot stamps prevent an older page from undoing a newer correction. */
export class CandleStore {
  private bars = new Map<number, { candle: Candle; asOf: number }>();
  result: ChartResult | undefined;
  merge(page: CandlePage) {
    const asOf = Date.parse(page.result.asOf);
    if (
      this.result &&
      (this.result.contractId !== page.result.contractId ||
        this.result.asset !== page.result.asset ||
        this.result.pair !== page.result.pair ||
        this.result.priceScale !== page.result.priceScale)
    )
      throw new Error(
        'The server changed the chart market or price scale. Reload the chart.',
      );
    const additions = new Set(
      page.frame.items
        .map((item) => Date.parse(item.timestamp))
        .filter((time) => !this.bars.has(time)),
    );
    if (this.bars.size + additions.size > maxChartCandles)
      throw new Error(
        'Chart memory limit reached. Select a coarser candle timeframe or shorter range.',
      );
    for (const candle of page.frame.items) {
      const time = Date.parse(candle.timestamp);
      const old = this.bars.get(time);
      if (!old || old.asOf <= asOf) this.bars.set(time, { candle, asOf });
    }
    if (!this.result || Date.parse(this.result.asOf) <= asOf)
      this.result = page.result;
  }
  get items() {
    return [...this.bars.values()]
      .map((item) => item.candle)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }
  get size() {
    return this.bars.size;
  }
}

/** Rounded hundredths of a percent, entirely in fixed-point integer arithmetic. */
export function percentage(current: string, reference: string): string | null {
  const base = BigInt(reference);
  if (base <= BigInt(0)) return null;
  const numerator = (BigInt(current) - base) * BigInt(10000);
  const magnitude =
    ((numerator < BigInt(0) ? -numerator : numerator) + base / BigInt(2)) /
    base;
  const sign = magnitude === BigInt(0) ? '' : numerator < BigInt(0) ? '-' : '+';
  return `${sign}${magnitude / BigInt(100)}.${String(magnitude % BigInt(100)).padStart(2, '0')}%`;
}

export function dailyPercentage(page: CandlePage): string | null {
  const day = candleBoundary(Date.parse(page.result.asOf), '1d');
  const current = page.frame.items.find(
    (item) => Date.parse(item.timestamp) === day,
  );
  const previous = page.frame.items.find(
    (item) => Date.parse(item.timestamp) === day - 86400000,
  );
  if (
    !current ||
    !previous?.complete ||
    previous.partial ||
    previous.close === null
  )
    return null;
  return percentage(current.close ?? current.latestPrice, previous.close);
}
