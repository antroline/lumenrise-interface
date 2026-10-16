'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useRevealed } from '../hooks/use-revealed';
import { curveModel, type CurveModelInput } from '../lib/curve-model';
import { useSvgId } from '../hooks/use-svg-id';
import { EngravePattern } from './engraving';
import { LaunchPanel } from './launch-panel';

export type LaunchFigure = { label: string; value: ReactNode; hint?: ReactNode; title?: string };

const WIDTH = 1000;
const HEIGHT = 240;
const SAMPLES = 96;

/**
 * Plot geometry for the configured curve. Price is proportional to (base / (base − sold))², so the shape
 * is drawn from that ratio; the area under it up to a point equals the quote raised by then.
 */
function curveGeometry(input: CurveModelInput) {
  const model = curveModel(input);
  if (!model || model.end <= BigInt(0)) return null;
  const base = Number(input.base);
  const end = Number(model.end);
  const ratio = (sold: number) => (base / (base - sold)) ** 2;
  const ceiling = ratio(end) * 1.14;
  const height = (sold: number) => ratio(sold) / ceiling;
  const clamp = (value: number) => Math.max(0, Math.min(value, 1));

  const line = Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const x = (index / SAMPLES) * WIDTH;
    const y = HEIGHT - height((end * index) / SAMPLES) * HEIGHT;
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const sold = clamp(Number(input.sold) / end);

  return {
    line,
    area: `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`,
    sold,
    soldHeight: height(sold * end),
    graduation: model.graduation === null ? null : clamp(Number(model.graduation) / end),
    end: model.end,
  };
}

function CurvePlot({
  input,
  failed,
  soldLabel,
  targetLabel,
  axisEnd,
}: {
  input: CurveModelInput;
  failed: boolean;
  soldLabel: string;
  targetLabel: string;
  axisEnd: (end: bigint) => string;
}) {
  const id = useSvgId();
  const revealed = useRevealed();
  const geometry = curveGeometry(input);
  if (!geometry)
    return <p className="py-10 text-[13px] text-muted-foreground">The configured parameters cannot produce a valid price curve.</p>;

  const { sold, graduation } = geometry;
  const toTarget = graduation !== null && graduation > sold ? graduation : sold;
  const percent = (value: number) => `${(value * 100).toFixed(3)}%`;

  return (
    <div>
      <div className="relative h-[240px]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible text-foreground"
        >
          <defs>
            <EngravePattern id={`${id}-lines`} />
            <EngravePattern id={`${id}-ink`} className="text-ink" />
            <clipPath id={`${id}-sold`}>
              <rect width={sold * WIDTH} height={HEIGHT} />
            </clipPath>
            <clipPath id={`${id}-target`}>
              <rect x={sold * WIDTH} width={(toTarget - sold) * WIDTH} height={HEIGHT} />
            </clipPath>
            <clipPath id={`${id}-beyond`}>
              <rect x={toTarget * WIDTH} width={(1 - toTarget) * WIDTH} height={HEIGHT} />
            </clipPath>
          </defs>

          <path d={geometry.area} clipPath={`url(#${id}-beyond)`} fill={`url(#${id}-lines)`} className="opacity-[0.13]" />
          <path d={geometry.area} clipPath={`url(#${id}-target)`} fill={`url(#${id}-lines)`} className="opacity-35" />
          <g
            className="transition-[clip-path] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
          >
            <g clipPath={`url(#${id}-sold)`}>
              <path d={geometry.area} className={failed ? 'fill-foreground/15' : 'fill-lime'} />
              <path d={geometry.area} fill={`url(#${id}-${failed ? 'lines' : 'ink'})`} className={failed ? 'opacity-30' : 'opacity-[0.22]'} />
            </g>
          </g>
          <path d={geometry.line} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>

        {graduation !== null && (
          <div aria-hidden="true" className="absolute inset-y-0 w-0" style={{ left: percent(graduation) }}>
            <span className="absolute inset-y-0 left-0 w-[1.5px] -translate-x-1/2 bg-chart-5" />
            <span
              className={cn(
                'absolute top-0 inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-2.5 text-[12px] font-medium whitespace-nowrap shadow-[0_1px_2px_rgb(24_24_12/0.08),0_4px_12px_-6px_rgb(24_24_12/0.25)] ring-1 ring-chart-5/45 dark:shadow-none',
                graduation > 0.62 ? 'right-2.5' : 'left-2.5',
              )}
            >
              <span className="size-2 rounded-full bg-chart-5" />
              {targetLabel}
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className={cn(
            'absolute size-0 transition-opacity delay-700 duration-300 motion-reduce:transition-none',
            revealed ? 'opacity-100' : 'opacity-0',
          )}
          style={{ left: percent(sold), bottom: percent(geometry.soldHeight) }}
        >
          <span className={cn('absolute size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-[2.5px] ring-foreground', failed ? 'bg-card' : 'bg-lime')} />
          <span
            className={cn(
              'absolute bottom-3.5 inline-flex h-7 items-center rounded-full bg-foreground px-2.5 text-[12px] font-medium whitespace-nowrap text-background tabular-nums',
              sold > 0.55 ? 'right-1' : 'left-1',
            )}
          >
            {soldLabel}
          </span>
        </div>
      </div>

      <div className="mt-2 flex justify-between gap-4 border-t border-foreground/80 pt-2 text-[12px] text-muted-foreground tabular-nums">
        <span>0 sold</span>
        <span>Tokens sold on the curve</span>
        <span>{axisEnd(geometry.end)}</span>
      </div>
    </div>
  );
}

function Figures({ items, className }: { items: LaunchFigure[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px bg-divider sm:grid-cols-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-card px-5 py-4 sm:px-8 sm:py-5">
          <dt className="text-[12.5px] text-muted-foreground">{item.label}</dt>
          <dd title={item.title} className="mt-1 break-words text-[17px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
            {item.value}
          </dd>
          {item.hint && <dd className="mt-1 text-[12px] leading-snug text-muted-foreground tabular-nums">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** The graduation instrument: raised amount as the headline, drawn as the engraved area under the model curve. */
export function LaunchHero({
  status,
  progress,
  raised,
  raisedTitle,
  target,
  remaining,
  pair,
  freshness,
  stale,
  curve,
  figures,
  note,
}: {
  status: string;
  progress: number | null;
  raised: string;
  raisedTitle?: string;
  target: string;
  remaining?: string;
  pair: string;
  freshness: string;
  stale: boolean;
  curve?: { input: CurveModelInput; soldLabel: string; targetLabel: string; axisEnd: (end: bigint) => string };
  figures: LaunchFigure[];
  note: string;
}) {
  const filled = Math.max(0, Math.min(progress ?? 0, 100));
  const percent = progress === null ? '—' : `${progress.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  const outlook =
    status === 'Graduated'
      ? 'Graduation confirmed by the contract'
      : status === 'Failed'
        ? 'The target was not reached'
        : remaining
          ? `${remaining} ${pair} to go`
          : null;

  return (
    <LaunchPanel id="graduation" aria-labelledby="graduation-heading" tabIndex={-1} className="scroll-mt-24 overflow-hidden outline-none">
      <div className="px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 id="graduation-heading" className="text-[15px] font-medium">
            Raised toward graduation
          </h2>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            {stale && <span aria-hidden="true" className="size-2 rounded-full bg-chart-5" />}
            {freshness}
          </p>
        </div>

        <div
          role="progressbar"
          aria-labelledby="graduation-heading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress === null ? undefined : filled}
          aria-valuetext={progress === null ? 'Unavailable' : `${percent} of the ${target} ${pair} target`}
          className="mt-3"
        >
          <p className="text-[clamp(3rem,7vw,5.75rem)] leading-[0.92] font-semibold tracking-[-0.04em] break-words tabular-nums">
            <span title={raisedTitle}>{raised}</span>
            <span className="ml-[0.18em] text-[0.36em] font-medium tracking-[-0.01em] text-muted-foreground">{pair}</span>
          </p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[15px] tabular-nums">
            <span>
              <span className="font-semibold">{percent}</span>
              <span className="text-muted-foreground">
                {' '}
                of {target} {pair} target
              </span>
            </span>
            {outlook && (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span className="text-muted-foreground">{outlook}</span>
              </>
            )}
          </p>
        </div>

        <div className="mt-8 pb-6 sm:mt-10">
          {curve ? (
            <CurvePlot failed={status === 'Failed'} {...curve} />
          ) : (
            <div className="grid h-[240px] place-items-center rounded-xl bg-secondary text-[13px] text-muted-foreground">
              Curve unavailable until the contract configuration loads
            </div>
          )}
        </div>
      </div>

      <Figures items={figures} className="border-t border-divider" />

      <p className="border-t border-divider px-5 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground sm:px-8">{note}</p>
    </LaunchPanel>
  );
}
