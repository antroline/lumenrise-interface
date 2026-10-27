'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AreaSeries, CandlestickSeries, ColorType, CrosshairMode, LineStyle, createChart,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChartCandlestick, ChartLine, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatTradingPriceAxis } from './price-history-format';

export type PriceHistoryPoint = {
  time: number; price: number; exactPrice: string;
  candle?: { open: number; high: number; low: number; close: number; exact: string };
};

const timestamp = (milliseconds: number) => milliseconds / 1000 as UTCTimestamp;

export function PriceHistoryPlot({ points, timeDomain, ticker, pair, embedded = false, rangeKey = '', chartType = 'area', onChartTypeChange, timeframeControl }: {
  points: PriceHistoryPoint[];
  timeDomain?: [number, number];
  ticker: string;
  pair: string;
  embedded?: boolean;
  rangeKey?: string;
  chartType?: 'area' | 'candles';
  onChartTypeChange?: (type: 'area' | 'candles') => void;
  timeframeControl?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const fittedRange = useRef<string | null>(null);
  const [selected, setSelected] = useState<PriceHistoryPoint | null>(null);
  const descriptionId = useId();

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const chart = createChart(element, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, attributionLogo: true, fontSize: 11 },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, minimumWidth: 64, ticksVisible: false, scaleMargins: { top: 0.15, bottom: 0.1 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      handleScroll: { vertTouchDrag: false },
      localization: { locale: 'en-US', priceFormatter: formatTradingPriceAxis },
    });
    const series = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
      pointMarkersVisible: false,
      pointMarkersRadius: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const candleSeries = chart.addSeries(CandlestickSeries, { visible: false, priceLineVisible: false, borderVisible: false });
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
        lineColor: token('--foreground'),
        topColor: token('--color-price-area', 0.4),
        bottomColor: token('--color-price-area', 0.06),
      });
      candleSeries.applyOptions({
        upColor: token('--ok'), wickUpColor: token('--ok'),
        downColor: token('--bad'), wickDownColor: token('--bad'),
      });
    };
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      themeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      candleRef.current = null;
      fittedRange.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const observations = new Map(points.map(point => [timestamp(point.time), point]));
    // Whitespace retains the server's selected window without inventing observations.
    const data = points.map(point => ({ time: timestamp(point.time), value: point.price }));
    const first = data[0];
    const last = data[data.length - 1];
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
    series.setData([
      ...(first && start !== undefined && start < first.time * 1000 ? [{ time: timestamp(start) }] : []),
      ...data,
      ...(last && end !== undefined && end > last.time * 1000 ? [{ time: timestamp(end) }] : []),
    ]);
    const candleSeries = candleRef.current;
    if (candleSeries) {
      candleSeries.applyOptions({ priceFormat: series.options().priceFormat });
      candleSeries.setData([
        ...(first && start !== undefined && start < first.time * 1000 ? [{ time: timestamp(start) }] : []),
        ...points.flatMap(point => point.candle ? [{ time: timestamp(point.time), open: point.candle.open, high: point.candle.high, low: point.candle.low, close: point.candle.close }] : []),
        ...(last && end !== undefined && end > last.time * 1000 ? [{ time: timestamp(end) }] : []),
      ]);
    }
    if (fittedRange.current !== rangeKey && first) {
      if (start !== undefined && end !== undefined && end > start) {
        chart.timeScale().setVisibleRange({ from: timestamp(start), to: timestamp(end) });
      } else chart.timeScale().fitContent();
      fittedRange.current = rangeKey;
    }
    const onCrosshair: Parameters<IChartApi['subscribeCrosshairMove']>[0] = event => {
      setSelected(typeof event.time === 'number' ? observations.get(event.time) ?? null : null);
    };
    chart.subscribeCrosshairMove(onCrosshair);
    return () => chart.unsubscribeCrosshairMove(onCrosshair);
  }, [points, timeDomain, rangeKey]);

  useEffect(() => {
    const chart = chartRef.current;
    const visibleRange = chart?.timeScale().getVisibleLogicalRange();
    seriesRef.current?.applyOptions({ visible: chartType === 'area' });
    candleRef.current?.applyOptions({ visible: chartType === 'candles' });
    if (visibleRange) chart?.timeScale().setVisibleLogicalRange(visibleRange);
  }, [chartType]);

  const observation = selected && points.find(point => point.time === selected.time) || points[points.length - 1];
  return (
    <div className={`flex min-w-0 w-full flex-col tabular-nums ${embedded ? 'h-full min-h-48 flex-1' : 'min-h-60'}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border/60 pb-2">
        <div className="min-w-0 flex-1 basis-48">
        <p className="min-w-0 break-all text-base font-semibold tracking-tight">
          {ticker} <span className="mx-1 font-normal text-muted-foreground/60">/</span> <span className="font-medium text-muted-foreground">{pair}</span>
        </p>
      <div className="min-h-6 text-xs leading-5">
        <p aria-live="polite" className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5 text-muted-foreground">
          {observation && <>
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium text-foreground">
              {chartType === 'candles'
                ? observation.candle?.exact.split(' · ').map(value => (
                    <span key={value.slice(0, 1)} className="min-w-0 break-all">
                      <span className="mr-1 font-normal text-muted-foreground">{value.slice(0, 1)}</span>{value.slice(2)}
                    </span>
                  ))
                : <span className="break-all text-base font-semibold tracking-tight">{observation.exactPrice}</span>}
              <span className="font-normal text-muted-foreground">{pair}</span>
            </span>
            <span className="whitespace-nowrap text-[11px]">{new Date(observation.time).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC</span>
          </>}
        </p>
      </div>
        </div>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5">
        <ToggleGroup aria-label="Chart type" value={[chartType]} onValueChange={values => {
          const next = values[0];
          if (next === 'area' || next === 'candles') onChartTypeChange?.(next);
        }} className="rounded-lg">
          <ToggleGroupItem value="area" aria-label="Area chart" title="Area chart" className="size-9 rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm motion-reduce:transition-none sm:size-8"><ChartLine aria-hidden="true" className="size-4" /></ToggleGroupItem>
          <ToggleGroupItem value="candles" aria-label="Candlestick chart" title="Candlestick chart" className="size-9 rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm motion-reduce:transition-none sm:size-8"><ChartCandlestick aria-hidden="true" className="size-4" /></ToggleGroupItem>
        </ToggleGroup>
        <div>{timeframeControl}</div>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="sm" aria-label="Reset chart view" className="size-9 shrink-0 px-0 text-muted-foreground hover:text-foreground sm:size-8" onClick={() => chartRef.current?.timeScale().fitContent()}><RotateCcw aria-hidden="true" className="size-3.5" /></Button>} />
          <TooltipContent>Fit all available prices in view</TooltipContent>
        </Tooltip>
        </div>
      </div>
      <p id={descriptionId} className="sr-only">{ticker} recorded price history in {pair}. Times in UTC. Use left and right arrow keys to inspect recorded prices. Drag to pan and pinch or scroll to zoom.</p>
      <div
        ref={container}
        role="group"
        aria-label={`${ticker} / ${pair} interactive price chart`}
        aria-describedby={descriptionId}
        tabIndex={0}
        className={`relative min-w-0 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${embedded ? 'min-h-40 flex-1' : 'h-60'}`}
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
      <span className="sr-only">TradingView Lightweight Charts™. Copyright (c) 2025 TradingView, Inc.</span>
    </div>
  );
}
