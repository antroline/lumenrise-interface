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

export function FeaturedLaunch({ network }: { network: ApiNetwork }) {
  const { query, open } = useHomeLaunches(network);
  const launch = open[0];

  return (
    <DarkPanel className="rounded-2xl p-5 sm:p-8">
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
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">Launches on Stellar</h1>
          <p role="alert" className="text-sm text-muted-foreground">Featured launch data could not be loaded.</p>
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      ) : launch ? (
        <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={64} />
              <span className="inline-flex items-center gap-2 text-sm font-medium"><span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />Open to participate</span>
              <span className="text-xs text-muted-foreground">{networkName(network)}</span>
            </div>
            <h1 className="mt-5 break-words text-[30px] leading-tight font-semibold tracking-[-0.03em] sm:text-[36px]">
              {launch.metadata.name}{' '}
              <span className="text-base font-medium tracking-normal text-muted-foreground">${launch.metadata.symbol}</span>
            </h1>
            {launch.metadata.description && <p className="mt-2 line-clamp-3 max-w-[60ch] break-words text-sm leading-relaxed text-muted-foreground">{launch.metadata.description}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href={`/launch/${launch.contractId}?network=${network}`} />} nativeButton={false}>
                Participate <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="ghost" render={<Link href={launchHref(launch, network)} />} nativeButton={false}>View launch</Button>
            </div>
          </div>
          <div className="min-w-0 border-t border-panel-line pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8 lg:pl-12">
            <h2 className="text-sm text-muted-foreground">Progress toward graduation</h2>
            <p className="mt-2 text-[36px] leading-tight font-semibold tracking-[-0.03em] tabular-nums sm:text-[44px]">{progressLabel(launch.bonding.progressBps)}</p>
            <Progress value={Math.max(0, Math.min(100, launch.bonding.progressBps / 100))} tone="lime" size="thick" aria-label={`${launch.metadata.name} graduation progress`} className="mt-4" />
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm tabular-nums">
              <div><dt className="text-muted-foreground">Raised</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.state.quoteReserve)} {pairLabel(launch.pair, network)}</dd></div>
              <div><dt className="text-muted-foreground">Graduation target</dt><dd className="mt-1 break-words font-medium">{compactAmount(launch.bonding.curve.graduationTarget)} {pairLabel(launch.pair, network)}</dd></div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Closest to graduation among open launches on this page.{launch.bonding.stateStale ? ' Indexed snapshot may be outdated.' : ''}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">Launches on Stellar</h1>
          <p className="text-sm text-muted-foreground">No launches are open for participation right now.</p>
          <Button render={<Link href={`/launches?network=${network}`} />} nativeButton={false}>Explore launches <ArrowRight data-icon="inline-end" /></Button>
        </div>
      )}
    </DarkPanel>
  );
}
