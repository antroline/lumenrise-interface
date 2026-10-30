'use client';

import { pairScale } from '@/lib/api/launches/display';

import Link from 'next/link';
import { TokenLogo } from '@/components/token-logo';
import { compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';

import { launchHref, type HomeLaunch } from './use-home-launches';

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

export function LaunchCard({ launch, network }: { launch: HomeLaunch; network: ApiNetwork }) {
  const b = launch.bonding;
  const pair = pairLabel(launch.pair, network);
  return (
    <article
      className={cn(
        'group relative flex min-w-0 flex-col rounded-xl bg-card p-3.5 text-card-foreground',
        'ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-6px_rgb(0_0_0/0.08)] dark:shadow-none dark:ring-white/[0.07]',
        'transition-[box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_14px_28px_-16px_rgb(0_0_0/0.24)] motion-reduce:transition-none dark:hover:ring-white/[0.14]',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-foreground',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="size-10 shrink-0 overflow-hidden rounded-[11px] bg-secondary [&_img]:rounded-none">
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={40} />
        </span>
        <div className="min-w-0 flex-1 pt-px">
          <h3 className="truncate text-[15.5px] leading-snug font-semibold tracking-[-0.02em]">
            <Link
              href={launchHref(launch, network)}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] group-hover:underline group-hover:underline-offset-4"
            >
              {launch.metadata.name}
            </Link>
          </h3>
          <p className="truncate text-[12.5px] text-muted-foreground">
            ${launch.metadata.symbol}
          </p>
        </div>
        <dl className="min-w-0 max-w-[45%] text-right">
          <dt className="text-[11px] text-muted-foreground">Target</dt>
          <dd className="break-words text-[13px] leading-snug font-medium tabular-nums">
            {compactAmount(b.curve.graduationTarget, pairScale(launch))} {pair}
          </dd>
        </dl>
      </div>
    </article>
  );
}

export function LaunchCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 rounded-xl bg-card p-3.5 ring-1 ring-black/[0.05] dark:ring-white/[0.07]">
      <div className="size-10 shrink-0 rounded-[11px] bg-secondary" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-4 w-3/4 rounded bg-secondary" />
        <div className="h-3 w-1/3 rounded bg-secondary" />
      </div>
      <div className="w-20 space-y-1.5">
        <div className="ml-auto h-3 w-8 rounded bg-secondary" />
        <div className="h-4 rounded bg-secondary" />
      </div>
    </div>
  );
}