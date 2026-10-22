'use client';
import { API_NETWORK } from '@/lib/stellar/network';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DarkPanel } from '@/components/dark-panel';
import { TokenLogo } from '@/components/token-logo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { compactAmount, pairLabel } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { launchHref, networkName, progressLabel, useHomeLaunches } from './use-home-launches';
import { canParticipate } from './home-discovery';

export function FeaturedLaunch({ network = API_NETWORK }: { network?: ApiNetwork }) {
  const { query, featured: launch } = useHomeLaunches(network);
  const participating = launch ? canParticipate(launch) : false;
  const status = launch?.bonding.state.graduated ? 'Graduated' : launch?.bonding.status;

  return (
    <div>
    <h2 className="mb-3 text-h2 font-semibold">Featured Launch</h2>
    <DarkPanel className="rounded-2xl p-4 sm:p-6 lg:p-7">
      {query.isPending ? (
        <div role="status" aria-label="Loading featured launch" className="grid gap-4 md:grid-cols-2 md:gap-8 motion-reduce:[&_[data-slot=skeleton]]:animate-none">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 md:flex md:flex-col md:items-start md:gap-4">
            <Skeleton className="size-12 rounded-2xl md:size-16" />
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="col-span-2 h-12 w-full" />
            <Skeleton className="col-span-2 h-10 w-full md:w-40" />
          </div>
          <Skeleton className="h-28 w-full md:h-auto md:min-h-40" />
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
        <div className="grid items-center gap-4 md:grid-cols-[1.2fr_1fr] md:gap-6 lg:gap-8">
          <div className="contents md:block md:min-w-0">
            <div className="min-w-0">
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 md:block">
                <div className="contents md:flex md:flex-wrap md:items-center md:gap-3">
                  <span className="col-start-1 row-start-1">
                    <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={48} />
                  </span>
                  <div className="col-span-2 row-start-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 md:contents">
                    <span className="inline-flex items-center gap-2 text-xs font-medium md:text-sm"><span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />{participating ? 'Open to participate' : status === 'Open' && launch.bonding.progressBps >= 10_000 ? '100% Filled' : status}</span>
                    <span className="text-xs text-muted-foreground">{networkName(network)}</span>
                  </div>
                </div>
                <h1 className="col-start-2 row-start-1 min-w-0 break-words text-xl leading-tight font-semibold tracking-[-0.03em] md:mt-4 md:text-big">
                  {launch.metadata.name}{' '}
                  <span className="block text-sm font-medium tracking-normal text-muted-foreground md:inline md:text-base">${launch.metadata.symbol}</span>
                </h1>
              </div>
              {launch.metadata.description && <p className="mt-2 line-clamp-2 max-w-[60ch] break-words text-sm leading-relaxed text-muted-foreground">{launch.metadata.description}</p>}
            </div>
            <div className="order-3 grid grid-cols-2 gap-2 md:mt-5 md:flex md:flex-wrap md:items-center md:gap-3">
              {participating && <Button className="w-full md:w-auto" render={<Link href={launchHref(launch, network)} />} nativeButton={false}>
                Participate <ArrowRight data-icon="inline-end" />
              </Button>}
              <Button className={cn('w-full md:w-auto', !participating && 'col-span-2')} variant={participating ? 'ghost' : 'default'} render={<Link href={launchHref(launch, network)} />} nativeButton={false}>View Launch</Button>
            </div>
          </div>
          <div className="order-2 min-w-0 border-t border-panel-line pt-4 md:order-none md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:block">
              <h2 className="text-xs text-muted-foreground md:text-sm">Progress toward graduation</h2>
              <p className="text-2xl leading-tight font-semibold tracking-[-0.03em] tabular-nums md:mt-2 md:text-display">{progressLabel(launch.bonding.progressBps)} <span className="sr-only text-sm font-normal tracking-normal text-muted-foreground md:not-sr-only">filled</span></p>
            </div>
            <Progress value={Math.max(0, Math.min(100, launch.bonding.progressBps / 100))} aria-valuetext={`${progressLabel(launch.bonding.progressBps)} filled`} tone="lime" size="thick" aria-label={`${launch.metadata.name} graduation progress`} className="mt-2 md:mt-3 [&_[data-slot=progress-indicator]]:motion-reduce:transition-none" />
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums md:mt-4 md:gap-4">
              <div><dt className="text-muted-foreground">Raised</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.state.quoteReserve)} {pairLabel(launch.pair, network)}</dd></div>
              <div><dt className="text-muted-foreground">Graduation target</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.curve.graduationTarget)} {pairLabel(launch.pair, network)}</dd></div>
            </dl>
            <p className={cn('text-xs leading-relaxed text-muted-foreground md:mt-4 md:block', launch.bonding.stateStale || query.isError || !participating ? 'mt-3' : 'hidden')}>
              <span className={participating ? 'hidden md:inline' : undefined}>{participating ? 'Highest progress among curves accepting participation on this page.' : status === 'Graduated' ? 'Graduation confirmed.' : 'Participation is currently unavailable.'}</span>
              {launch.bonding.stateStale ? ' Indexed snapshot may be outdated.' : ''}{query.isError ? ' Refresh failed; showing the last loaded snapshot.' : ''}
            </p>
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
