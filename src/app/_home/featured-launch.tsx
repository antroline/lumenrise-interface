'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DarkPanel } from '@/components/dark-panel';
import { TokenLogo } from '@/components/token-logo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { launchHref, networkName, progressLabel, useHomeLaunches } from './use-home-launches';
import { canParticipate } from './home-discovery';

export function FeaturedLaunch({ network }: { network: ApiNetwork }) {
  const { query, featured: launch } = useHomeLaunches(network);
  const participating = launch ? canParticipate(launch) : false;
  const status = launch?.bonding.state.graduated ? 'Graduated' : launch?.bonding.status;

  return (
    <div>
    <h2 className="mb-3 text-h2 font-semibold">Featured Launch</h2>
    <DarkPanel className="rounded-2xl p-5 sm:p-6 lg:p-7">
      {query.isPending ? (
        <div role="status" aria-label="Loading featured launch" className="grid gap-8 md:grid-cols-2 motion-reduce:[&_[data-slot=skeleton]]:animate-none">
          <div className="flex flex-col gap-4">
            <Skeleton className="size-16 rounded-2xl" />
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="min-h-40 w-full" />
          <h1 className="sr-only">Launches on Stellar</h1>
        </div>
      ) : query.isError && !query.data ? (
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">Launches on Stellar</h1>
          <p role="alert" className="text-sm text-muted-foreground">Featured launch data could not be loaded.</p>
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      ) : launch ? (
        <div className="grid items-center gap-6 md:grid-cols-[1.2fr_1fr] lg:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={48} />
              <span className="inline-flex items-center gap-2 text-sm font-medium"><span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />{participating ? 'Open to participate' : status === 'Open' && launch.bonding.progressBps >= 10_000 ? '100% Filled' : status}</span>
              <span className="text-xs text-muted-foreground">{networkName(network)}</span>
            </div>
            <h1 className="mt-4 break-words text-big leading-tight font-semibold tracking-[-0.03em]">
              {launch.metadata.name}{' '}
              <span className="text-base font-medium tracking-normal text-muted-foreground">${launch.metadata.symbol}</span>
            </h1>
            {launch.metadata.description && <p className="mt-2 line-clamp-2 max-w-[60ch] break-words text-sm leading-relaxed text-muted-foreground">{launch.metadata.description}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {participating && <Button render={<Link href={launchHref(launch, network)} />} nativeButton={false}>
                Participate <ArrowRight data-icon="inline-end" />
              </Button>}
              <Button variant={participating ? 'ghost' : 'default'} render={<Link href={launchHref(launch, network)} />} nativeButton={false}>View Launch</Button>
            </div>
          </div>
          <div className="min-w-0 border-t border-panel-line pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8">
            <h2 className="text-sm text-muted-foreground">Progress toward graduation</h2>
            <p className="mt-2 text-display leading-tight font-semibold tracking-[-0.03em] tabular-nums">{progressLabel(launch.bonding.progressBps)} <span className="text-sm font-normal tracking-normal text-muted-foreground">filled</span></p>
            <Progress value={Math.max(0, Math.min(100, launch.bonding.progressBps / 100))} aria-valuetext={`${progressLabel(launch.bonding.progressBps)} filled`} tone="lime" size="thick" aria-label={`${launch.metadata.name} graduation progress`} className="mt-3 [&_[data-slot=progress-indicator]]:motion-reduce:transition-none" />
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm tabular-nums">
              <div><dt className="text-muted-foreground">Raised</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.state.quoteReserve)} {pairLabel(launch.pair, network)}</dd></div>
              <div><dt className="text-muted-foreground">Graduation target</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.curve.graduationTarget)} {pairLabel(launch.pair, network)}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{participating ? 'Highest progress among curves accepting participation on this page.' : status === 'Graduated' ? 'Graduation confirmed.' : 'Participation is currently unavailable.'}{launch.bonding.stateStale ? ' Indexed snapshot may be outdated.' : ''}{query.isError ? ' Refresh failed; showing the last loaded snapshot.' : ''}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">Launches on Stellar</h1>
          <p className="text-sm text-muted-foreground">No featured launch is available on this network yet.</p>
          <Button render={<Link href={`/launches?network=${network}`} />} nativeButton={false}>Explore launches <ArrowRight data-icon="inline-end" /></Button>
        </div>
      )}
    </DarkPanel>
    </div>
  );
}
