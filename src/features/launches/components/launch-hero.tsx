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

const figureRow = 'grid min-h-10 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-2';
const figureLabel =
  'flex min-w-0 items-center gap-2 text-xs leading-5 text-neutral-500 sm:text-[13px] dark:text-neutral-400';
const figureValue =
  'flex min-w-0 flex-col justify-center text-right text-xs leading-5 font-medium text-neutral-900 tabular-nums sm:text-[13px] dark:text-neutral-50';

function Figures({
  items,
  loading = false,
}: {
  items: LaunchFigure[];
  loading?: boolean;
}) {
  return (
    <dl className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {items.map((item) => (
        <div key={item.label} className={figureRow}>
          <dt className={figureLabel}>
            <item.icon
              aria-hidden="true"
              className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
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
      <div className="relative h-[360px] min-w-0 overflow-hidden border-neutral-200 bg-white p-4 sm:rounded-xl sm:border dark:border-neutral-800 dark:bg-neutral-900">
        {priceChart}
      </div>
      <div className="mt-4 bg-white p-4 text-neutral-900 sm:rounded-xl dark:bg-neutral-900 dark:text-neutral-50">
        {timeline}
        <div className={timeline ? 'pt-5' : undefined}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2
              id="graduation-heading"
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400"
            >
              <Flag aria-hidden="true" className="size-3.5" />
              <TradeTooltipText
                content={`Progress toward the configured reserve target. Curve trading closes when the contract confirms graduation.${graduationPrice ? ` Estimated marginal price at the target: ${graduationPrice}. This is not a prediction of the future market price.` : ''}`}
              >
                Graduation
              </TradeTooltipText>
            </h2>
            {loading ? (
              <Skeleton className="h-4 w-10 motion-reduce:animate-none" />
            ) : (
              <span className="text-xs font-semibold tabular-nums">{percent}</span>
            )}
          </div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {pair}
                </span>
                <span className="sr-only">raised</span>
              </p>
            )}
            <p className="flex flex-wrap items-baseline gap-x-1 text-xs text-neutral-500 dark:text-neutral-400">
              Target
              {loading ? (
                <Skeleton className="inline-block h-4 w-20 motion-reduce:animate-none" />
              ) : (
                <span className="font-medium text-neutral-900 tabular-nums dark:text-neutral-50">{target} {pair}</span>
              )}
            </p>
          </div>
          {loading ? (
            <div role="status" aria-label="Loading graduation progress">
              <Skeleton className="h-2 w-full rounded-full motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              <Progress
                value={progress === null ? null : filled}
                size="thick"
                tone="lime"
                aria-labelledby="graduation-heading"
                aria-valuetext={
                  progress === null
                    ? 'Unavailable'
                    : `${percent} of the ${target} ${pair} target. ${status} launch.`
                }
                title={stale ? 'May be outdated' : freshness}
                className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-neutral-200 dark:[&_[data-slot=progress-track]]:bg-neutral-800 [&_[data-slot=progress-indicator]]:bg-brand-lime [&_[data-slot=progress-indicator]]:transition-[width] [&_[data-slot=progress-indicator]]:duration-300 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
              />
            </>
          )}
        </div>
        <Figures items={figures} loading={loading} />
      </div>
    </section>
  );
}
