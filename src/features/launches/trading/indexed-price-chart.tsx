'use client';

import { useState } from 'react';
import { PriceHistoryPlot, type PriceHistoryPoint } from './price-history-plot';
import { formatExactPrice } from './price-history-format';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import type { ChartRange } from '@/lib/api/launches/market';
import { chartNumber, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { ChartTimeframeSelector, PriceChart } from './price-chart';
import {
  displayWindow,
  earlierBoundary,
  type CandleTimeframe,
} from './candle-history';
import { useCandleHistory } from './use-candle-history';
import { getApiChain } from '@/lib/api/client';

export function IndexedPriceChart({
  slug,
  network,
  ticker,
  pair,
  price,
  active = true,
  embedded = false,
}: {
  slug: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
  price: string;
  active?: boolean;
  embedded?: boolean;
}) {
  // A keyed chart-local session prevents even one render of another market's candles.
  return (
    <ChartSession
      key={`${getApiChain()}:${network}:${slug}`}
      {...{ slug, network, ticker, pair, price, active, embedded }}
    />
  );
}

function ChartSession({
  slug,
  network,
  ticker,
  pair,
  price,
  active,
  embedded,
}: {
  slug: string;
  network: ApiNetwork;
  ticker: string;
  pair: string;
  price: string;
  active: boolean;
  embedded: boolean;
}) {
  const [range, setRange] = useState<ChartRange>('1D');
  const [custom, setCustom] = useState(false);
  const [timeframe, setTimeframe] = useState<CandleTimeframe>('15m');
  const [chartType, setChartType] = useState<'area' | 'candles'>('area');
  const [window, setWindow] = useState(() => displayWindow('1D', Date.now()));
  const [requestedLower, setRequestedLower] = useState(window?.[0]);
  const [viewKey, setViewKey] = useState(0);
  const [following, setFollowing] = useState(true);
  const history = useCandleHistory(
    slug,
    network,
    timeframe,
    requestedLower,
    active && !!slug,
  );
  const displayedHistory = history.result
    ? history
    : (history.previous ?? history);
  const selectRange = (next: ChartRange) => {
    setRange(next);
    setCustom(false);
    setFollowing(true);
    const bounds = displayWindow(next, Date.now());
    setWindow(bounds);
    setRequestedLower(bounds?.[0]);
    setViewKey((value) => value + 1);
  };
  const controls = (
    <ChartTimeframeSelector
      range={custom ? null : range}
      onRangeChange={selectRange}
      timeframe={timeframe}
      onTimeframeChange={(next) => {
        setTimeframe(next);
        setRequestedLower(window?.[0]);
      }}
    />
  );
  let points: PriceHistoryPoint[] = [],
    precisionError = '';
  try {
    if (displayedHistory.result) {
      const scale = displayedHistory.result.priceScale;
      points = displayedHistory.items.map((candle) => ({
        time: Date.parse(candle.timestamp),
        price: chartNumber(candle.close ?? candle.latestPrice, scale),
        exactPrice: formatExactPrice(candle.close ?? candle.latestPrice, scale),
        candle: {
          open: chartNumber(candle.open, scale),
          high: chartNumber(candle.high, scale),
          low: chartNumber(candle.low, scale),
          close: chartNumber(candle.close ?? candle.latestPrice, scale),
          exact: `O ${formatExactPrice(candle.open, scale)} · H ${formatExactPrice(candle.high, scale)} · L ${formatExactPrice(candle.low, scale)} · C ${formatExactPrice(candle.close ?? candle.latestPrice, scale)}`,
          status: `${candle.complete ? 'Completed' : 'Open'}${candle.partial ? ' · Partial opening history' : ''}`,
          endsAt: candle.endsAt,
        },
      }));
    }
  } catch (cause) {
    precisionError =
      cause instanceof Error
        ? cause.message
        : 'These prices cannot be plotted accurately.';
  }
  // Resolve the server's pair asset on the selected network; no dollar conversion is implied.
  const quote = displayedHistory.result
    ? pairLabel(displayedHistory.result.pair, network)
    : pair;
  const timeDomain: [number, number] | undefined =
    window && displayedHistory.result
      ? following && !custom
        ? displayWindow(range, Date.parse(displayedHistory.result.asOf))
        : window
      : undefined;
  const content =
    history.loading && !points.length ? (
      <Skeleton
        className={embedded ? 'h-full min-h-0 w-full' : 'h-60 w-full'}
      />
    ) : precisionError || !points.length ? (
      <Empty className={embedded ? 'h-full min-h-0 p-3' : 'min-h-60'}>
        <EmptyHeader>
          <EmptyTitle>
            {precisionError || history.error
              ? 'Price chart unavailable'
              : 'Price history not available yet'}
          </EmptyTitle>
          <EmptyDescription>
            {precisionError ||
              history.error ||
              'Recorded prices will appear here when available.'}
          </EmptyDescription>
        </EmptyHeader>
        {history.error && (
          <Button variant="outline" onClick={history.retry}>
            Retry
          </Button>
        )}
      </Empty>
    ) : (
      <PriceHistoryPlot
        timeframeControl={controls}
        chartType={chartType}
        onChartTypeChange={setChartType}
        rangeKey={`${viewKey}:${displayedHistory.timeframe ?? timeframe}`}
        points={points}
        timeDomain={timeDomain}
        ticker={ticker}
        pair={quote}
        embedded={embedded}
        following={following}
        onFollowingChange={setFollowing}
        preset={!custom}
        onManualRange={(bounds) => {
          setCustom(true);
          setWindow(bounds);
        }}
        onNeedHistory={(time, bars) => {
          if (history.result)
            history.loadEarlier(earlierBoundary(time, timeframe, bars));
        }}
        dailyChange={displayedHistory.daily}
      />
    );
  const historyStatus = [
    !history.older && range === 'ALL' && !custom && history.exhausted
      ? 'All available history loaded'
      : '',
    history.limited ? 'History limit reached; use coarser candles.' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <PriceChart
      embedded={embedded}
      ticker={ticker}
      price={price}
      quoteSymbol={quote}
      history={{
        inlineControls: !!points.length && !precisionError,
        range,
        onRangeChange: selectRange,
        controls,
        dailyChange: displayedHistory.daily,
        content: (
          <div
            aria-busy={history.loading}
            className={
              embedded ? 'flex h-full min-h-0 flex-1 flex-col' : 'min-h-60'
            }
          >
            {content}
            {/* {(historyStatus || (range === 'ALL' && !custom)) && (
              <p
                className="min-h-4 shrink-0 text-xs text-muted-foreground"
                title={
                  history.result
                    ? `Server snapshot: ${history.result.asOf}. Last price observation: ${history.result.lastObservationAt ?? 'unavailable'}.${history.limited ? ' Chart memory limit: 100,000 candles. Choose a coarser timeframe or shorter range.' : ''}`
                    : undefined
                }
              >
                {historyStatus}
              </p>
            )} */}
            {history.error && points.length > 0 && (
              <p
                role="alert"
                aria-label={`Could not refresh price history. ${history.error}`}
                className="flex shrink-0 items-center justify-between gap-2 text-xs text-destructive"
              >
                <span className="min-w-0 truncate" title={history.error}>
                  Could not refresh price history.
                </span>
                <Button variant="outline" size="sm" onClick={history.retry}>
                  Retry
                </Button>
              </p>
            )}
          </div>
        ),
      }}
    />
  );
}
