'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenLogo } from '@/components/token-logo';
import { compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { launchStatus } from './home-discovery';
import { ProjectMarquee } from './project-marquee';
import { launchHref, progressLabel, useHomeLaunches, type HomeLaunch } from './use-home-launches';

const QUARTERS = [25, 50, 75];

const cardClass =
  'min-w-0 rounded-2xl bg-card p-5 text-card-foreground ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6 dark:shadow-none dark:ring-white/[0.07]';

function CardHeading({ id, title, meta }: { id: string; title: string; meta?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h3 id={id} className="text-base font-semibold">{title}</h3>
      {meta && <p className="text-xs text-muted-foreground tabular-nums">{meta}</p>}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="flex min-h-32 items-center justify-center px-4 text-center text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function Identity({ launch, size = 32 }: { launch: HomeLaunch; size?: 28 | 32 }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0 overflow-hidden rounded-full [&_img]:rounded-none [&_svg]:rounded-none" style={{ width: size, height: size }}>
        <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={size} />
      </span>
      <span className="min-w-0 truncate text-sm font-medium underline-offset-4 group-hover:underline">{launch.metadata.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">${launch.metadata.symbol}</span>
    </span>
  );
}

/** Inset threshold bar: quarter gaps cut the track, lime runs to the current tick, orange marks graduation. */
function Runway({ progressBps }: { progressBps: number }) {
  const value = Math.max(0, Math.min(100, progressBps / 100));
  return (
    <span aria-hidden="true" className="relative block h-3">
      <span className="absolute inset-0 rounded-[3px] bg-foreground/[0.07]" />
      <span className="absolute inset-y-0 left-0 rounded-[3px] bg-lime" style={{ width: `${value}%` }} />
      {QUARTERS.map((quarter) => (
        <span key={quarter} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-card" style={{ left: `${quarter}%` }} />
      ))}
      <span className="absolute -inset-y-1.5 right-0 w-0.5 bg-chart-5" />
      <span className="absolute -inset-y-1 w-1 -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${value}%` }} />
    </span>
  );
}

function GraduationBoard({ launches, network }: { launches: HomeLaunch[]; network: ApiNetwork }) {
  return (
    <section aria-labelledby="graduation-heading" className={cardClass}>
      <CardHeading
        id="graduation-heading"
        title="Closest to graduation"
        meta={
          <span className="inline-flex items-center gap-1.5">
            Graduation <span aria-hidden="true" className="h-3 w-0.5 bg-chart-5" /> at 100%
          </span>
        }
      />
      {launches.length ? (
        <ol className="flex flex-col">
          {launches.map((launch, index) => {
            const b = launch.bonding;
            const pair = pairLabel(launch.pair, network);
            return (
              <li key={launch.contractId} className="border-t border-divider first:border-t-0">
                <Link
                  href={launchHref(launch, network)}
                  className="group -mx-2 grid gap-3 rounded-lg px-2 py-4 outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <Identity launch={launch} />
                    </span>
                    <span className="shrink-0 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                      {progressLabel(b.progressBps)}
                      <span className="sr-only"> of the graduation target</span>
                    </span>
                  </span>
                  <span className="pl-8">
                    <Runway progressBps={b.progressBps} />
                    <span className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
                      <span className="truncate">{compactAmount(b.state.quoteReserve)} {pair} raised</span>
                      <span className="shrink-0">{launchStatus(launch) === 'Filled' ? 'Filled · awaiting graduation' : `Target ${compactAmount(b.curve.graduationTarget)} ${pair}`}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyNote>No curves are trading right now.</EmptyNote>
      )}
    </section>
  );
}

export function LaunchBrowser({ network }: { network: ApiNetwork }) {
  const { query, launches, open } = useHomeLaunches(network);

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <ProjectMarquee launches={launches} network={network} pending={query.isPending} />

      {query.isPending ? (
        <div role="status" aria-label="Loading closest launches to graduation" className="motion-reduce:[&_[data-slot=skeleton]]:animate-none">
          <Skeleton className="h-[34rem] rounded-2xl" />
        </div>
      ) : (
        <GraduationBoard launches={open.slice(0, 5)} network={network} />
      )}

      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">{query.data ? 'Launch data could not be refreshed.' : 'Launches could not be loaded.'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{query.data ? 'Showing the last loaded snapshot. ' : ''}{query.error.message}</p>
          </div>
          <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      )}
    </div>
  );
}
