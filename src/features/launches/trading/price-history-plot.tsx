'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AreaSeries, CandlestickSeries, ColorType, CrosshairMode, LineStyle, createChart,
  type IChartApi, type ISeriesApi, type UTCTimestamp, type Logical,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChartCandlestick, ChartLine, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPriceAxis, formatTradingPriceAxis } from './price-history-format';

export type PriceHistoryPoint = {
  time: number; price: number; exactPrice: string;
  candle?: { open: number; high: number; low: number; close: number; exact: string; status?: string; endsAt?: string };
};

const timestamp = (milliseconds: number) => milliseconds / 1000 as UTCTimestamp;

export function PriceHistoryPlot({ points, timeDomain, ticker, pair, embedded = false, rangeKey = '', chartType = 'area', onChartTypeChange, timeframeControl, following = true, preset = true, onFollowingChange, onManualRange, onNeedHistory, dailyChange }: {
  points: PriceHistoryPoint[];
  timeDomain?: [number, number];
  ticker: string;
  pair: string;
  embedded?: boolean;
  rangeKey?: string;
  chartType?: 'area' | 'candles';
  onChartTypeChange?: (type: 'area' | 'candles') => void;
  timeframeControl?: ReactNode;
  following?: boolean;
  preset?: boolean;
  onFollowingChange?: (following: boolean) => void;
  onManualRange?: (range: [number, number]) => void;
  onNeedHistory?: (time: number, bars: number) => void;
  dailyChange?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const fittedRange = useRef<string | null>(null);
  const [selected, setSelected] = useState<PriceHistoryPoint | null>(null);
  const descriptionId = useId();
  const latest = useRef({ points, onFollowingChange, onManualRange, onNeedHistory });
  useEffect(() => { latest.current = { points, onFollowingChange, onManualRange, onNeedHistory }; }, [points, onFollowingChange, onManualRange, onNeedHistory]);
  const manualUntil = useRef(0);
  const applying = useRef(false);
  const programmedRange = useRef<{ from: number; to: number } | null>(null);
  const previousPoints = useRef<PriceHistoryPoint[]>([]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const chart = createChart(element, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, attributionLogo: true, fontSize: 12 },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, minimumWidth: 0, ticksVisible: false, scaleMargins: { top: 0.15, bottom: 0.1 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, minBarSpacing: 0.001 },
      handleScroll: { vertTouchDrag: false },
      // Compact marker/crosshair labels avoid an oversized gutter; ticks retain full precision.
      localization: { locale: 'en-US', priceFormatter: formatPriceAxis, tickmarksPriceFormatter: (values: number[]) => values.map(formatTradingPriceAxis) },
    });
    const series = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: true,
      pointMarkersVisible: false,
      pointMarkersRadius: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const candleSeries = chart.addSeries(CandlestickSeries, { visible: false, priceLineVisible: true, borderVisible: false });
    candleRef.current = candleSeries;

    const applyTheme = () => {
      const styles = getComputedStyle(element);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      // Tailwind may resolve tokens to lab()/oklch(), which the chart parser cannot read.
      const token = (name: string, opacity = 1) => {
        const value = styles.getPropertyValue(name).trim();
        if (!context) return value;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return `rgba(${red}, ${green}, ${blue}, ${alpha / 255 * opacity})`;
      };
      chart.applyOptions({
        layout: { textColor: token('--muted-foreground'), fontFamily: styles.fontFamily },
        grid: { vertLines: { visible: false }, horzLines: { color: token('--border', 0.5) } },
        crosshair: {
          vertLine: { color: token('--muted-foreground', 0.5), width: 1, style: LineStyle.Dashed, labelBackgroundColor: token('--foreground') },
          horzLine: { color: token('--muted-foreground', 0.5), width: 1, style: LineStyle.Dashed, labelBackgroundColor: token('--foreground') },
        },
      });
      series.applyOptions({
        priceLineColor: token('--foreground'),
        lineColor: token('--foreground'),
        topColor: token('--color-price-area', 0.4),
        bottomColor: token('--color-price-area', 0.06),
      });
      candleSeries.applyOptions({
        priceLineColor: token('--foreground'),
        upColor: token('--ok'), wickUpColor: token('--ok'),
        downColor: token('--bad'), wickDownColor: token('--bad'),
      });
    };
    const onRange: Parameters<ReturnType<IChartApi['timeScale']>['subscribeVisibleLogicalRangeChange']>[0] = logical => {
      if (!logical || applying.current) return;
      const programmed = programmedRange.current;
      if (programmed && logical.from === programmed.from && logical.to === programmed.to) return;
      const current = latest.current;
      if (Date.now() < manualUntil.current) {
        const bounds = chart.timeScale().getVisibleRange();
        current.onFollowingChange?.(logical.to >= current.points.length - 2);
        if (bounds && typeof bounds.from === 'number' && typeof bounds.to === 'number')
          current.onManualRange?.([bounds.from * 1000, bounds.to * 1000]);
      }
      if (Date.now() < manualUntil.current && logical.from < 10 && current.points.length)
        current.onNeedHistory?.(current.points[0].time, Math.max(100, Math.ceil(-logical.from) + 100));
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      themeObserver.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      candleRef.current = null;
      fittedRange.current = null;
      previousPoints.current = [];
      programmedRange.current = null;
      applying.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    applying.current = true;
    const visible = chart.timeScale().getVisibleLogicalRange();
    const oldPoints = previousPoints.current;
    const offset = oldPoints.length ? points.findIndex(point => point.time === oldPoints[0].time) : 0;
    const appended = oldPoints.length ? points.filter(point => point.time > oldPoints[oldPoints.length - 1].time).length : 0;
    const observations = new Map(points.map(point => [timestamp(point.time), point]));
    const data = points.map(point => ({ time: timestamp(point.time), value: point.price }));
    const first = data[0];
    const start = timeDomain?.[0];
    const end = timeDomain?.[1];
    const minimum = points.reduce((min, point) => {
      const price = point.candle?.low || point.price;
      return price > 0 ? Math.min(min, price) : min;
    }, Infinity);
    // TradingView requires a decimal base; arbitrary minimum movements can reject valid token prices.
    const base = Number.isFinite(minimum) ? 10 ** Math.min(300, Math.max(0, 6 - Math.floor(Math.log10(minimum)))) : 100;
    series.applyOptions({
      pointMarkersVisible: points.length === 1,
      priceFormat: {
        type: 'custom',
        formatter: formatTradingPriceAxis,
        minMove: 1 / base,
        base,
      },
    });
    const candleSeries = candleRef.current;
    candleSeries?.applyOptions({ priceFormat: series.options().priceFormat });
    const candleData = (point: PriceHistoryPoint) => point.candle ? { time: timestamp(point.time), open: point.candle.open, high: point.candle.high, low: point.candle.low, close: point.candle.close } : null;
    const canUpdate = oldPoints.length > 0 && points.length >= oldPoints.length && oldPoints.every((point, index) => point.time === points[index].time);
    if (canUpdate) {
      for (let index = 0; index < points.length; index++) {
        const point = points[index], previous = oldPoints[index];
        if (previous && previous.price === point.price && previous.candle?.open === point.candle?.open && previous.candle?.high === point.candle?.high && previous.candle?.low === point.candle?.low && previous.candle?.close === point.candle?.close) continue;
        const historical = index < oldPoints.length - 1;
        series.update({ time: timestamp(point.time), value: point.price }, historical);
        const bar = candleData(point);
        if (bar) candleSeries?.update(bar, historical);
      }
    } else {
      // History prepends and gap repairs replace the ordered dataset once.
      series.setData(data);
      candleSeries?.setData(points.flatMap(point => { const bar = candleData(point); return bar ? [bar] : []; }));
    }
    if (first && (fittedRange.current !== rangeKey || preset && following && (offset > 0 || appended > 0))) {
      if (start !== undefined && end !== undefined && end > start) {
        chart.timeScale().setVisibleRange({ from: timestamp(start), to: timestamp(end) });
      } else chart.timeScale().fitContent();
      fittedRange.current = rangeKey;
    } else if (visible && offset >= 0) {
      // Prepending shifts logical indices; compensate without changing candle spacing.
      const shift = offset + (following ? appended : 0);
      chart.timeScale().setVisibleLogicalRange({ from: (visible.from + shift) as Logical, to: (visible.to + shift) as Logical });
    }
    previousPoints.current = points;
    programmedRange.current = chart.timeScale().getVisibleLogicalRange();
    applying.current = false;
    const onCrosshair: Parameters<IChartApi['subscribeCrosshairMove']>[0] = event => {
      setSelected(typeof event.time === 'number' ? observations.get(event.time) ?? null : null);
    };
    chart.subscribeCrosshairMove(onCrosshair);
    return () => chart.unsubscribeCrosshairMove(onCrosshair);
  }, [points, timeDomain, rangeKey, following, preset]);

  useEffect(() => {
    const chart = chartRef.current;
    const visibleRange = chart?.timeScale().getVisibleLogicalRange();
    seriesRef.current?.applyOptions({ visible: chartType === 'area' });
    candleRef.current?.applyOptions({ visible: chartType === 'candles' });
    if (visibleRange) chart?.timeScale().setVisibleLogicalRange(visibleRange);
  }, [chartType]);

  const observation = selected && points.find(point => point.time === selected.time) || points[points.length - 1];
  return (
    <div className={`flex min-w-0 w-full flex-col tabular-nums ${embedded ? 'min-h-0 flex-1' : 'min-h-60'}`}>
      <div className="mb-3 flex shrink-0 flex-col gap-2.5 border-b border-border/60 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="min-w-0 break-all text-sm font-semibold tracking-tight">
            {ticker} <span className="mx-1 font-normal text-muted-foreground/60">/</span> <span className="font-medium text-muted-foreground">{pair}</span>
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title="Change relative to the previous completed UTC daily close">
            <span>Daily</span>
            <span className={dailyChange?.startsWith('+') ? 'font-semibold text-ok' : dailyChange?.startsWith('-') ? 'font-semibold text-bad' : 'font-semibold text-foreground'}>{dailyChange ?? '—'}</span>
          </span>
        </div>
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1" aria-label="Current price">
          <span className="min-w-0 break-all text-2xl leading-none font-semibold tracking-tight text-foreground">{points[points.length - 1]?.exactPrice ?? '—'}</span>
          <span className="text-xs font-medium text-muted-foreground">{pair}</span>
        </p>
        {observation && <div className="flex min-w-0 flex-col gap-1.5 text-xs leading-4 text-muted-foreground" aria-live="polite">
          {chartType === 'candles' && <p className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {observation.candle?.exact.split(' · ').map(value => <span key={value.slice(0, 1)} className="min-w-0 break-all">
              <span className="mr-1">{value.slice(0, 1)}</span><span className="font-medium text-foreground">{value.slice(2)}</span>
            </span>)}
          </p>}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={new Date(observation.time).toISOString()} className="whitespace-nowrap">{new Date(observation.time).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC</time>
            {chartType === 'area' && selected && <span className="min-w-0 break-all">At cursor <span className="font-medium text-foreground">{observation.exactPrice}</span> {pair}</span>}
            {observation.candle?.status && <span className="inline-flex items-center gap-1.5" title={observation.candle.endsAt ? `Interval ends ${new Date(observation.candle.endsAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC` : undefined}>
              <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/60" />{observation.candle.status}
            </span>}
          </div>
        </div>}
      </div>
      <p id={descriptionId} className="sr-only">{ticker} recorded price history in {pair}. Times in UTC. Use left and right arrow keys to inspect recorded prices. Drag to pan and pinch or scroll to zoom.</p>
      <div
        ref={container}
        role="group"
        aria-label={`${ticker} / ${pair} interactive price chart`}
        aria-describedby={descriptionId}
        tabIndex={0}
        className={`relative min-w-0 w-full [--chart-dot:color-mix(in_srgb,var(--foreground)_18%,transparent)] dark:[--chart-dot:var(--border)] [&_tr:first-child>td:nth-child(2)]:bg-[radial-gradient(circle,var(--chart-dot)_1px,transparent_1px)] [&_tr:first-child>td:nth-child(2)]:bg-size-[16px_16px] [&_a#tv-attr-logo]:rounded-sm [&_a#tv-attr-logo]:bg-card [&_a#tv-attr-logo]:ring-4 [&_a#tv-attr-logo]:ring-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${embedded ? 'min-h-24 flex-1' : 'h-60'}`}
        onPointerDown={() => { manualUntil.current = Date.now() + 1500; }}
        onPointerMove={event => { if (event.buttons) manualUntil.current = Date.now() + 1500; }}
        onWheel={() => { manualUntil.current = Date.now() + 1500; }}
        onTouchMove={() => { manualUntil.current = Date.now() + 1500; }}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !points.length) return;
          event.preventDefault();
          const current = observation ? points.indexOf(observation) : points.length - 1;
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)));
          const point = points[index];
          setSelected(point);
          const activeSeries = chartType === 'candles' ? candleRef.current : seriesRef.current;
          if (activeSeries) chartRef.current?.setCrosshairPosition(point.price, timestamp(point.time), activeSeries);
        }}
      />
      <div role="group" aria-label="Chart controls" className="mt-2.5 flex max-w-full shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-t border-border/60 pt-2.5 pb-0.5 [scrollbar-width:thin] sm:gap-1.5">
        {timeframeControl}
        <ToggleGroup aria-label="Chart type" value={[chartType]} onValueChange={values => {
          const next = values[0];
          if (next === 'area' || next === 'candles') onChartTypeChange?.(next);
        }} className="shrink-0 rounded-lg bg-muted/50!">
          <ToggleGroupItem value="area" aria-label="Area chart" title="Area chart" className="size-8 rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-foreground! data-pressed:text-background! data-pressed:shadow-none motion-reduce:transition-none"><ChartLine aria-hidden="true" className="size-4" /></ToggleGroupItem>
          <ToggleGroupItem value="candles" aria-label="Candlestick chart" title="Candlestick chart" className="size-8 rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-foreground! data-pressed:text-background! data-pressed:shadow-none motion-reduce:transition-none"><ChartCandlestick aria-hidden="true" className="size-4" /></ToggleGroupItem>
        </ToggleGroup>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" aria-label="Reset chart view" className="size-8 shrink-0 rounded-md px-0 text-muted-foreground hover:text-foreground" onClick={() => { manualUntil.current = Date.now() + 1500; chartRef.current?.timeScale().fitContent(); }}><RotateCcw aria-hidden="true" /></Button>} />
            <TooltipContent>Reset view · Fit available history</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <span className="sr-only">TradingView Lightweight Charts™. Copyright (c) 2025 TradingView, Inc.</span>
    </div>
  );
}
