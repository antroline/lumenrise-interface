'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { TokenLogo } from '@/components/token-logo';
import { compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { MiniCurve } from './mini-curve';
import {
  curveInput,
  launchHref,
  progressLabel,
  timeUntil,
  type HomeLaunch,
} from './use-home-launches';

const statusLabel = {
  Open: 'Open',
  Scheduled: 'Soon',
  Graduated: 'Graduated',
  Failed: 'Failed',
} as const;

export function StatusPill({ status }: { status: HomeLaunch['bonding']['status'] }) {
  const lit = status === 'Open' || status === 'Graduated';
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium',
        lit ? 'bg-ink text-white' : status === 'Failed' ? 'bg-warn-soft text-warn' : 'bg-secondary text-foreground',
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', lit ? 'bg-lime' : 'bg-current')} />
      <span className="sr-only">Status: </span>
      {statusLabel[status]}
    </span>
  );
}

function Figure({ label, value, hint, title }: { label: string; value: ReactNode; hint?: ReactNode; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd title={title} className="mt-0.5 truncate text-[14px] leading-tight font-semibold tracking-[-0.01em] tabular-nums">
        {value}
      </dd>
      {hint && <dd className="truncate text-[11.5px] text-muted-foreground tabular-nums">{hint}</dd>}
    </div>
  );
}

export function LaunchCard({ launch, network, now }: { launch: HomeLaunch; network: ApiNetwork; now: number }) {
  const b = launch.bonding;
  const pair = pairLabel(launch.pair, network);
  const third =
    b.status === 'Scheduled'
      ? { label: 'Opens in', value: timeUntil(b.startsAt, now) }
      : b.status === 'Open'
        ? { label: 'Ends in', value: timeUntil(b.endsAt, now) }
        : { label: 'Buyers', value: b.state.buyerCount.toLocaleString('en-US') };

  return (
    <article
      className={cn(
        'group relative flex min-w-0 flex-col rounded-2xl bg-card p-4 text-card-foreground sm:p-5',
        'ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-6px_rgb(0_0_0/0.08)] dark:shadow-none dark:ring-white/[0.07]',
        'transition-[box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_14px_28px_-16px_rgb(0_0_0/0.24)] motion-reduce:transition-none dark:hover:ring-white/[0.14]',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-foreground',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="size-10 shrink-0 overflow-hidden rounded-[11px] bg-secondary [&_img]:rounded-none">
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={40} />
        </span>
        <div className="min-w-0 flex-1 pt-px">
          <h3 className="truncate text-[15.5px] leading-snug font-semibold tracking-[-0.02em]">
            <Link
              href={launchHref(launch, network)}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:underline group-hover:underline-offset-4"
            >
              {launch.metadata.name}
            </Link>
          </h3>
          <p className="truncate text-[12.5px] text-muted-foreground">
            ${launch.metadata.symbol} · {pair}
          </p>
        </div>
        <StatusPill status={b.status} />
      </div>

      {launch.metadata.description && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-[1.55] text-muted-foreground">{launch.metadata.description}</p>
      )}

      <div className="mt-auto pt-4">
        <MiniCurve input={curveInput(b)} failed={b.status === 'Failed'} />
      </div>

      <dl className="mt-3 grid grid-cols-[1.3fr_1fr_1fr] gap-x-3 border-t border-divider pt-3">
        <Figure
          label="Raised"
          value={
            <span className="inline-flex items-center gap-1.5">
              {b.stateStale && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-chart-5" />}
              {compactAmount(b.state.quoteReserve)} {pair}
            </span>
          }
          title={b.stateStale ? 'Indexed state may be out of date' : undefined}
          hint={`of ${compactAmount(b.curve.graduationTarget)}`}
        />
        <Figure label="Progress" value={progressLabel(b.progressBps)} />
        <Figure {...third} />
      </dl>
    </article>
  );
}

export function LaunchCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col rounded-2xl bg-card p-4 ring-1 ring-black/[0.05] sm:p-5 dark:ring-white/[0.07]">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-[11px] bg-secondary" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-1/2 rounded bg-secondary" />
          <div className="h-3 w-1/4 rounded bg-secondary" />
        </div>
      </div>
      <div className="mt-4 h-3 w-5/6 rounded bg-secondary" />
      <div className="mt-6 h-16 rounded-lg bg-secondary/70" />
      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-divider pt-3">
        <div className="h-8 rounded bg-secondary" />
        <div className="h-8 rounded bg-secondary" />
        <div className="h-8 rounded bg-secondary" />
      </div>
    </div>
  );
}
