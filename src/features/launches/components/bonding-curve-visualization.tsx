'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  curveModel,
  plotRatio,
  modelPrice,
  type CurveModelInput,
} from '../lib/curve-model';
import { detailAmount } from '../lib/bonding-details';
import { UNIT } from '../bonding/contract';
import { compactLaunchAmount } from '../lib/compact-launch-amount';

export function BondingCurveVisualization({
  input,
  ticker,
  pair,
  currentPrice,
  stale,
}: {
  input: CurveModelInput;
  ticker: string;
  pair: string;
  currentPrice?: string | null;
  stale: boolean;
}) {
  const model = curveModel(input);
  if (!model)
    return (
      <p className="text-[13px] text-muted-foreground">
        The available parameters cannot produce a valid pricing model.
      </p>
    );
  const observed = currentPrice == null ? null : BigInt(currentPrice);
  let minimum = model.points[0].price;
  let maximum = model.points[model.points.length - 1].price;
  if (observed !== null && observed < minimum) minimum = observed;
  if (observed !== null && observed > maximum) maximum = observed;
  const margin = (maximum - minimum) / BigInt(10) || BigInt(1);
  maximum += margin;
  const points = model.points.map((point) => ({
    ...point,
    x: plotRatio(point.sold, BigInt(0), model.end),
    y: plotRatio(point.price, minimum, maximum),
  }));
  const priceLabel = (value: number) =>
    detailAmount(
      (
        minimum +
        (BigInt(Math.round(value * 1_000_000)) * (maximum - minimum)) /
          BigInt(1_000_000)
      ).toString(),
    );
  const quantityLabel = (value: number) => {
    const quantity =
      (BigInt(Math.round(value * 1_000_000)) * model.end) / BigInt(1_000_000);
    const step =
      quantity >= UNIT * BigInt(100)
        ? UNIT
        : quantity >= UNIT
          ? UNIT / BigInt(100)
          : BigInt(1);
    return compactLaunchAmount(detailAmount(
      (((quantity + step / BigInt(2)) / step) * step).toString(),
    ));
  };
  return (
    <figure className="min-w-0" aria-label={`Bonding curve pricing model for ${ticker} in ${pair}`}>
      <div className="min-w-0 overflow-hidden">
        <ChartContainer
          config={{ y: { label: 'Model price', color: 'var(--foreground)' } }}
          className="h-[280px] w-full aspect-auto"
        >
          <LineChart
            data={points}
            margin={{ top: 32, right: 24, bottom: 12, left: 4 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical
              horizontal
              stroke="var(--border)"
              strokeDasharray="2 5"
            />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 1]}
              tickFormatter={quantityLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={priceLabel}
              tickLine={false}
              axisLine={false}
              width={90}
              tickCount={4}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--foreground)', strokeDasharray: '3 4' }}
              content={({ active, payload }) => {
                const point: unknown = payload?.[0]?.payload;
                if (
                  !active ||
                  !point ||
                  typeof point !== 'object' ||
                  !('sold' in point) ||
                  !('price' in point) ||
                  typeof point.sold !== 'bigint' ||
                  typeof point.price !== 'bigint'
                )
                  return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-small text-popover-foreground">
                    <p>
                      {detailAmount(point.sold.toString())} {ticker} net sold
                    </p>
                    <p className="mt-1 font-semibold">
                      {detailAmount(point.price.toString())} {pair} / {ticker}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Model price · before fees
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: 'var(--color-lime)',
                stroke: 'var(--foreground)',
              }}
              isAnimationActive={false}
            />
            {model.graduation !== null && (
              <ReferenceLine
                x={plotRatio(model.graduation, BigInt(0), model.end)}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 5"
                label={{
                  value: 'Target estimate',
                  position: 'insideTopRight',
                  fontSize: 11,
                  fill: 'var(--muted-foreground)',
                }}
              />
            )}
            <ReferenceDot
              x={plotRatio(input.sold, BigInt(0), model.end)}
              y={plotRatio(
                observed ?? model.currentModelPrice,
                minimum,
                maximum,
              )}
              r={5}
              fill="var(--color-lime)"
              stroke="var(--foreground)"
              strokeWidth={1.5}
            />
            {model.graduation !== null && (
              <ReferenceDot
                x={plotRatio(model.graduation, BigInt(0), model.end)}
                y={plotRatio(
                  modelPrice(input.base, input.quote, model.graduation),
                  minimum,
                  maximum,
                )}
                r={3}
                fill="var(--card)"
                stroke="var(--foreground)"
              />
            )}
          </LineChart>
        </ChartContainer>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full bg-foreground" />
            Marginal price · {pair} / {ticker}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-lime ring-1 ring-foreground/30" />
            {observed === null
              ? 'Model at current position'
              : `Current position${stale ? ' · may be outdated' : ''}`}
          </span>
          <span>Horizontal axis: net {ticker} sold</span>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[72ch] text-[12.5px] leading-relaxed text-muted-foreground">
        Calculated from the configured virtual reserves, with the contract’s
        rounding.{' '}
        {model.graduation !== null
          ? `The target estimate is ${compactLaunchAmount(detailAmount(model.graduation.toString()))} ${ticker} net sold; only the contract status confirms graduation.`
          : 'A target position is unavailable within the curve allocation.'}{' '}
        This is a pricing model, not recorded trading activity.
      </figcaption>
    </figure>
  );
}
