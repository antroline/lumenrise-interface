'use client';

import { routeNetwork } from '@/lib/chain-address';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';
import { TokenLogo } from '@/components/token-logo';
import { Button } from '@/components/ui/button';
import { useCreatorLaunches } from '@/features/launches/hooks/queries';
import { pairScale, compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { useLaunchpad } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { StatusPill } from './launch-card';
import {
  launchHref,
  progressLabel,
  timeUntil,
  useHomeLaunches,
  type HomeLaunch,
} from './use-home-launches';

const BUCKETS = ['0–25%', '25–50%', '50–75%', '75–100%'];

function RailCard({ title, meta, children, className }: { title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={title}
      className={cn(
        'min-w-0 rounded-2xl bg-card p-4 text-card-foreground ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-6px_rgb(0_0_0/0.08)] sm:p-5 dark:shadow-none dark:ring-white/[0.07]',
        className,
      )}
    >
      <header className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h2>
        {meta && <p className="text-[12px] text-muted-foreground tabular-nums">{meta}</p>}
      </header>
      {children}
    </section>
  );
}

function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-2.5">
          <span className="size-6 rounded-[7px] bg-secondary" />
          <span className="h-3 flex-1 rounded bg-secondary" />
          <span className="h-3 w-10 rounded bg-secondary" />
        </li>
      ))}
    </ul>
  );
}

function LaunchRow({ launch, network, side }: { launch: HomeLaunch; network: ApiNetwork; side: ReactNode }) {
  return (
    <li>
      <Link
        href={launchHref(launch, network)}
        className="group -mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
      >
        <span className="size-6 shrink-0 overflow-hidden rounded-[7px] bg-secondary [&_img]:rounded-none">
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={24} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{launch.metadata.name}</span>
        {side}
      </Link>
    </li>
  );
}

/** Where the open launches stand: a progress histogram and what their curves hold. */
function OpenCurves({ network }: { network: ApiNetwork }) {
  const { query, open, scheduled, graduated, failed } = useHomeLaunches(network);
  const counts = [0, 0, 0, 0];
  for (const launch of open) counts[Math.min(3, Math.floor(launch.bonding.progressBps / 2500))] += 1;
  const tallest = Math.max(1, ...counts);
  const reserves = new Map<string, bigint>();
  for (const launch of open) {
    const scale = pairScale(launch);
    if (scale === null) continue;
    const pair = launch.pair + ':' + scale;
    reserves.set(pair, (reserves.get(pair) ?? BigInt(0)) + BigInt(launch.bonding.state.quoteReserve));
  }
  const finished = graduated.length + failed.length;

  return (
    <RailCard title="Open curves" meta={query.isSuccess ? `${open.length} trading` : undefined}>
      {query.isPending ? (
        <div aria-hidden="true" className="h-[132px] rounded-lg bg-secondary/70" />
      ) : query.isError ? (
        <p className="text-[13px] text-muted-foreground">Unavailable right now.</p>
      ) : (
        <>
          <figure>
            <div className="flex h-20 items-end gap-2">
              {counts.map((count, index) => (
                <div key={BUCKETS[index]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11.5px] font-medium tabular-nums">{count}</span>
                  <span
                    className={cn('w-full rounded-t-[5px]', count ? 'bg-linear-to-t from-lime/25 to-lime' : 'bg-secondary')}
                    style={{ height: count ? `${Math.max(8, (count / tallest) * 100)}%` : '3px' }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2 border-t border-foreground/70 pt-1.5">
              {BUCKETS.map((bucket) => (
                <span key={bucket} className="flex-1 text-center text-[10.5px] text-muted-foreground tabular-nums">
                  {bucket}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">
              Open launches by progress toward graduation:{' '}
              {BUCKETS.map((bucket, index) => `${bucket}: ${counts[index]}`).join(', ')}
            </figcaption>
          </figure>
          <dl className="mt-4 space-y-1.5 border-t border-divider pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Raised on open curves</dt>
              <dd className="text-right font-medium tabular-nums">
                {reserves.size
                  ? [...reserves].map(([pair, amount]) => (
                      <span key={pair} className="block whitespace-nowrap">
                        {compactAmount(amount.toString(), Number(pair.split(':')[1]))} {pairLabel(pair.split(':')[0], network)}
                      </span>
                    ))
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Upcoming</dt>
              <dd className="font-medium tabular-nums">{scheduled.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Graduated of finished</dt>
              <dd className="font-medium tabular-nums">{finished ? `${graduated.length} of ${finished}` : '—'}</dd>
            </div>
          </dl>
        </>
      )}
    </RailCard>
  );
}

function EndingSoon({ network }: { network: ApiNetwork }) {
  const { query, endingSoon } = useHomeLaunches(network);
  const [now] = useState(() => Date.now());
  const rows = endingSoon.slice(0, 4);
  if (query.isSuccess && rows.length === 0) return null;
  return (
    <RailCard title="Ending soon">
      {query.isPending ? (
        <RowSkeleton />
      ) : query.isError ? (
        <p className="text-[13px] text-muted-foreground">Unavailable right now.</p>
      ) : (
        <ul>
          {rows.map((launch) => (
            <LaunchRow
              key={launch.contractId}
              launch={launch}
              network={network}
              side={
                <span className="flex shrink-0 items-baseline gap-2 text-[12.5px] tabular-nums">
                  <span className="text-muted-foreground">{progressLabel(launch.bonding.progressBps)}</span>
                  <span className="w-14 text-right font-medium">{timeUntil(launch.bonding.endsAt, now)}</span>
                </span>
              }
            />
          ))}
        </ul>
      )}
    </RailCard>
  );
}

function YourLaunches({ network }: { network: ApiNetwork }) {
  const { isSignedIn, address, login, loginPending } = useLaunchpad();
  const owner = isSignedIn ? address : undefined;
  const query = useCreatorLaunches(owner, network);
  const mine = (query.data?.launches ?? []).filter((launch): launch is HomeLaunch => launch.bonding !== null);

  if (!owner)
    return (
      <RailCard title="Your launches">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Connect the wallet you launch from to follow your curves here.
        </p>
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => void login()} disabled={loginPending}>
          <Wallet data-icon="inline-start" />
          {loginPending ? 'Connecting…' : 'Connect wallet'}
        </Button>
      </RailCard>
    );

  return (
    <RailCard title="Your launches" meta={query.isSuccess && mine.length ? mine.length : undefined}>
      {query.isPending ? (
        <RowSkeleton rows={2} />
      ) : query.isError ? (
        <p className="text-[13px] text-muted-foreground">Your launches could not be loaded.</p>
      ) : mine.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          No launches from this wallet yet.{' '}
          <Link href="/create" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      ) : (
        <>
          <ul>
            {mine.slice(0, 3).map((launch) => (
              <LaunchRow
                key={launch.contractId}
                launch={launch}
                network={network}
                side={
                  <span className="flex shrink-0 items-center gap-2 text-[12.5px] tabular-nums">
                    <span className="font-medium">{progressLabel(launch.bonding.progressBps)}</span>
                    <StatusPill status={launch.bonding.status} />
                  </span>
                }
              />
            ))}
          </ul>
          {mine.length > 3 && (
            <Link
              href={`/projects?owner=${owner}&network=${routeNetwork(network)}`}
              className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              All of yours
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </>
      )}
    </RailCard>
  );
}

export function HomeRail({ network }: { network: ApiNetwork }) {
  return (
    <aside aria-label="Launch overview" className="grid content-start gap-4 md:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1">
      <OpenCurves network={network} />
      <EndingSoon network={network} />
      <YourLaunches network={network} />
    </aside>
  );
}
