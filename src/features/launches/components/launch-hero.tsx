'use client';

import type { ReactNode } from 'react';
import { Flag, type LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeTooltipText } from '../trading/trade-tooltip';

export type LaunchFigure = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  title?: string;
  help?: string;
};

const figureRow = 'grid h-9 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3';
const figureLabel =
  'flex min-w-0 items-center gap-2.5 text-[13px] leading-5 font-medium text-foreground';
const figureValue =
  'flex min-w-0 flex-col justify-center text-right text-[13px] leading-5 font-semibold tabular-nums';

function Figures({
  items,
  loading = false,
}: {
  items: LaunchFigure[];
  loading?: boolean;
}) {
  return (
    <dl className="mt-3 divide-y divide-border">
      {items.map((item) => (
        <div key={item.label} className={figureRow}>
          <dt className={figureLabel}>
            <item.icon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <TradeTooltipText
              content={[
                item.help,
                typeof item.hint === 'string' ? item.hint : undefined,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </TradeTooltipText>
          </dt>
          <dd className={figureValue}>
            {loading ? (
              <Skeleton className="ml-auto h-4 w-24 motion-reduce:animate-none" />
            ) : (
              <TradeTooltipText content={item.title} className="break-words">
                {item.value}
              </TradeTooltipText>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Price history with a persistent graduation progress bar beneath it. */
export function LaunchHero({
  status,
  progress,
  raised,
  raisedTitle,
  target,
  pair,
  freshness,
  stale,
  figures,
  priceChart,
  timeline,
  graduationPrice,
  loading = false,
}: {
  status: string;
  progress: number | null;
  raised: string;
  raisedTitle?: string;
  target: string;
  pair: string;
  freshness?: string;
  stale: boolean;
  figures: LaunchFigure[];
  priceChart: ReactNode;
  timeline?: ReactNode;
  graduationPrice?: string;
  loading?: boolean;
}) {
  const filled = Math.max(0, Math.min(progress ?? 0, 100));
  const percent =
    progress === null
      ? '—'
      : `${filled.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  return (
    <section
      id="graduation"
      aria-label="Price history and graduation"
      tabIndex={-1}
      aria-busy={loading || undefined}
      className="min-w-0 scroll-mt-24 outline-none"
    >
      <div className="relative h-[360px] min-w-0 overflow-hidden rounded-xl bg-[#f5f5f2] p-4 dark:bg-muted">
        {priceChart}
      </div>
      {timeline}
      <div className="py-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          {loading ? (
            <div role="status" aria-label="Loading amount raised">
              <Skeleton className="h-7 w-44 motion-reduce:animate-none sm:h-8 sm:w-56" />
            </div>
          ) : (
            <p className="flex flex-wrap items-baseline gap-1.5 tabular-nums">
              <span className="text-[22px] leading-tight font-semibold tracking-[-0.025em] sm:text-2xl">
                <TradeTooltipText
                  content={
                    raisedTitle
                      ? `${raisedTitle} held in net quote reserves.${stale ? ' Indexed data may be outdated.' : ''}`
                      : undefined
                  }
                >
                  {raised}
                </TradeTooltipText>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {pair}
              </span>
              <span className="sr-only">raised</span>
            </p>
          )}
          <h2
            id="graduation-heading"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <Flag aria-hidden="true" className="size-3.5" />
            <TradeTooltipText
              content={`Progress toward the configured reserve target. Curve trading closes when the contract confirms graduation.${graduationPrice ? ` Estimated marginal price at the target: ${graduationPrice}. This is not a prediction of the future market price.` : ''}`}
            >
              Graduation
            </TradeTooltipText>
          </h2>
        </div>
        {loading ? (
          <div role="status" aria-label="Loading graduation progress">
            <Skeleton className="h-2.5 w-full rounded-full motion-reduce:animate-none" />
            <div
              aria-hidden="true"
              className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
            >
              <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
            </div>
          </div>
        ) : (
          <>
            <Progress
              value={progress === null ? null : filled}
              size="thick"
              tone={status === 'Failed' ? 'default' : 'lime'}
              aria-labelledby="graduation-heading"
              aria-valuetext={
                progress === null
                  ? 'Unavailable'
                  : `${percent} of the ${target} ${pair} target`
              }
              title={stale ? 'May be outdated' : freshness}
              className="[&_[data-slot=progress-track]]:bg-muted-foreground dark:[&_[data-slot=progress-track]]:bg-white/15 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
            />
            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
              <p>
                <span className="font-semibold">{percent}</span>{' '}
                <span className="text-muted-foreground">of target</span>
              </p>
              <p className="text-muted-foreground">
                Target{' '}
                <span className="font-medium text-foreground">
                  {target} {pair}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
      <Figures items={figures} loading={loading} />
    </section>
  );
}
