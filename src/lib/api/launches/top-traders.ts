import { ApiError } from '../client';
import { getTrades } from './market';
import type { ApiNetwork } from './types';

/** Rank the complete recorded history using recorded pair amounts before creator fees. */
export async function getTopTraders(
  slug: string,
  network: ApiNetwork,
  signal?: AbortSignal,
) {
  const traders = new Map<string, { buy: bigint; sell: bigint; count: number }>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  let pair: string | undefined;
  let priceScale: number | undefined;
  do {
    signal?.throwIfAborted();
    const page = await getTrades(slug, network, { limit: 100, cursor: cursor ?? undefined }, signal);
    signal?.throwIfAborted();
    if (pair !== undefined && (page.pair !== pair || page.priceScale !== priceScale))
      throw new ApiError('Trade history returned inconsistent currencies.', 'invalid-response');
    pair = page.pair;
    priceScale = page.priceScale;
    for (const trade of page.items) {
      const total = traders.get(trade.trader) ?? { buy: BigInt(0), sell: BigInt(0), count: 0 };
      total[trade.side] += BigInt(trade.grossAmount);
      total.count += 1;
      traders.set(trade.trader, total);
    }
    if (page.nextCursor === null) break;
    if (cursors.has(page.nextCursor))
      throw new ApiError('Trade history pagination did not advance. Try again.', 'invalid-response');
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (cursor !== null);

  const items = [...traders.entries()]
    .sort(([a, left], [b, right]) => {
      const leftVolume = left.buy + left.sell, rightVolume = right.buy + right.sell;
      return leftVolume === rightVolume ? a.localeCompare(b) : leftVolume > rightVolume ? -1 : 1;
    })
    .slice(0, 10)
    .map(([trader, total]) => ({
      trader,
      buyVolume: total.buy.toString(),
      sellVolume: total.sell.toString(),
      volume: (total.buy + total.sell).toString(),
      tradeCount: total.count,
    }));
  return { pair, priceScale, items };
}
