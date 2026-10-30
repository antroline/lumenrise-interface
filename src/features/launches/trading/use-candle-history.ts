'use client';

import { useEffect, useRef, useState } from 'react';
import { CandleStore, candleBoundary, dailyPercentage, maxChartCandles, requestCandles, type CandleTimeframe, type CandlePage } from './candle-history';
import type { Candle, ChartResult } from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { useQueryClient } from '@tanstack/react-query';
import { getApiChain } from '@/lib/api/client';

type HistoryState = {
  items: Candle[]; result?: ChartResult; daily: string | null;
  loading: boolean; older: boolean; exhausted: boolean; error: string; limited: boolean;
};
const initial: HistoryState = { items: [], daily: null, loading: true, older: false, exhausted: false, error: '', limited: false };
type DisplayHistory = Pick<HistoryState, 'items' | 'result' | 'daily'> & { timeframe: CandleTimeframe };
type SessionState = HistoryState & { identity?: string; market?: string; timeframe?: CandleTimeframe; previous?: DisplayHistory };

function previousDisplay(state: SessionState, market: string): DisplayHistory | undefined {
  if (state.market !== market) return;
  if (state.result && state.timeframe) return { items: state.items, result: state.result, daily: state.daily, timeframe: state.timeframe };
  return state.previous;
}

export function useCandleHistory(slug: string, network: ApiNetwork, timeframe: CandleTimeframe, lower: number | undefined, active: boolean) {
  const client = useQueryClient();
  const market = `${getApiChain()}:${network}:${slug}`;
  const identity = `${market}:${timeframe}:${active}`;
  const [state, setState] = useState<SessionState>(initial);
  const target = useRef(lower);
  useEffect(() => { target.current = lower; }, [lower]);
  const controls = useRef({ wake: () => {}, earlier: (_time: number) => {} });
  useEffect(() => {
    const store = new CandleStore();
    let disposed = false, running = false, exhausted = false, limited = false;
    let cursor: string | undefined, daily: string | null = null, error = '', failures = 0;
    let dailyAsOf = -Infinity;
    let reconnect: CandlePage[] | undefined;
    let requested = target.current, historyTarget = requested;
    let nextRefresh = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    const publish = (older = false) => {
      if (!disposed) {
        const snapshot = { identity, market, timeframe, items: store.items, result: store.result, daily, loading: store.size === 0 && !store.result && !error, older, exhausted, limited, error };
        setState(previous => ({ ...snapshot, previous: snapshot.result ? undefined : previousDisplay(previous, market) }));
      }
    };
    const fetchPage = (signal: AbortSignal, options: { from?: number; to?: string; limit?: number } = {}) => requestCandles(slug, network, timeframe, signal, options);
    const needsHistory = () => {
      const first = store.items[0];
      return !!first && !exhausted && !limited && (historyTarget === undefined || Date.parse(first.timestamp) > candleBoundary(historyTarget, timeframe));
    };
    const pump = async () => {
      clearTimeout(timer);
      if (disposed || running || document.hidden || !active) return;
      running = true;
      request = new AbortController();
      const signal = request.signal;
      try {
        if (Date.now() >= nextRefresh) {
          // No historical bounds: always ask the server for its current snapshot.
          const recent = await fetchPage(signal, { limit: store.result ? 8 : 1000 });
          const last = store.items.at(-1);
          if (!store.result) {
            cursor = recent.frame.nextBefore ?? recent.frame.items[0]?.timestamp;
            exhausted = !recent.frame.hasMore;
          }
          // Stage disjoint snapshots until pagination reaches the stored tail.
          if (reconnect || last && recent.frame.items.length && Date.parse(recent.frame.items[0].timestamp) > Date.parse(last.timestamp))
            reconnect = [recent, ...(reconnect ?? [])];
          else store.merge(recent);
          limited = store.size >= maxChartCandles;
          try {
            const day = timeframe === '1d' ? recent : await requestCandles(slug, network, '1d', signal, { limit: 3 });
            if (day.result.contractId !== recent.result.contractId || day.result.pair !== recent.result.pair || day.result.asset !== recent.result.asset)
              throw new Error('The daily candle response does not match the selected market.');
            if (Date.parse(day.result.asOf) >= dailyAsOf) {
              daily = dailyPercentage(day);
              dailyAsOf = Date.parse(day.result.asOf);
            }
          } catch (cause) {
            daily = null;
            throw cause;
          }
          nextRefresh = Date.now() + 3000;
          error = '';
          failures = 0;
          publish();
        }
        // Reconnect work is also bounded. Daily snapshots continue between batches.
        for (let batch = 0; reconnect && batch < 3; batch++) {
          const bridge = reconnect[reconnect.length - 1];
          const last = store.items.at(-1);
          if (!last || bridge.frame.items.length && Date.parse(bridge.frame.items[0].timestamp) <= Date.parse(last.timestamp)) {
            for (const page of reconnect.reverse()) store.merge(page);
            reconnect = undefined;
            limited = store.size >= maxChartCandles;
            publish();
            break;
          }
          if (!bridge.frame.hasMore || !bridge.frame.nextBefore) throw new Error('The server could not backfill the missing candles. Retry to reconnect.');
          if (reconnect.reduce((sum, page) => sum + page.frame.items.length, 0) + store.size >= maxChartCandles) throw new Error('Reconnect exceeds the chart memory limit. Select a coarser candle timeframe.');
          const before = bridge.frame.nextBefore;
          const older = await fetchPage(signal, { to: before });
          if (older.frame.nextBefore && Date.parse(older.frame.nextBefore) >= Date.parse(before)) throw new Error('Candle pagination did not advance.');
          reconnect.push(older);
          publish(true);
        }
        // Three pages per turn; All remains progressive and every page is published.
        for (let batch = 0; batch < 3 && !reconnect && needsHistory(); batch++) {
          if (!cursor) throw new Error('The server omitted the older-history cursor.');
          publish(true);
          const before = cursor;
          const pageTarget = historyTarget;
          const page = await fetchPage(signal, { to: before, from: pageTarget, limit: Math.min(1000, maxChartCandles - store.size) });
          store.merge(page);
          exhausted = pageTarget === historyTarget && !page.frame.hasMore;
          cursor = page.frame.nextBefore ?? store.items[0]?.timestamp;
          if (!exhausted && (!cursor || Date.parse(cursor) >= Date.parse(before))) throw new Error('Candle pagination did not advance.');
          limited = store.size >= maxChartCandles;
          error = '';
          failures = 0;
          publish(needsHistory());
        }
      } catch (cause) {
        if (!signal.aborted) {
          error = cause instanceof Error ? cause.message : 'Could not refresh price history.';
          failures++;
          publish();
        }
      } finally {
        running = false;
        if (!disposed && !document.hidden && active) {
          const delay = failures ? Math.min(120000, 3000 * 2 ** Math.min(failures - 1, 3)) : reconnect || needsHistory() ? 80 : Math.max(80, nextRefresh - Date.now());
          timer = setTimeout(() => void pump(), delay);
        }
      }
    };
    controls.current = {
      wake: () => {
        if (requested !== target.current) {
          requested = target.current;
          historyTarget = requested;
          exhausted = false;
          cursor ??= store.items[0]?.timestamp;
        }
        nextRefresh = 0;
        void pump();
      },
      earlier: time => {
        if (historyTarget !== undefined && time < historyTarget) {
          historyTarget = time;
          exhausted = false;
          cursor ??= store.items[0]?.timestamp;
        }
        void pump();
      },
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.hidden) request?.abort();
      else { nextRefresh = 0; void pump(); }
    };
    const unsubscribe = client.getQueryCache().subscribe(event => {
      const key = event.query.queryKey;
      if (event.type === 'updated' && event.action.type === 'invalidate' &&
          key[0] === 'launch' && key[1] === getApiChain() && key[2] === network && key[3] === slug) {
        nextRefresh = 0;
        void pump();
      }
    });
    document.addEventListener('visibilitychange', visibility);
    void pump();
    return () => {
      disposed = true;
      unsubscribe();
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [client, slug, network, timeframe, active, identity, market]);
  useEffect(() => { controls.current.wake(); }, [lower]);
  return { ...(state.identity === identity ? state : initial), timeframe, previous: state.identity === identity ? state.previous : previousDisplay(state, market), retry: () => controls.current.wake(), loadEarlier: (time: number) => controls.current.earlier(time) };
}
