'use client';
import { API_NETWORK } from '@/lib/stellar/network';

import { Button } from '@/components/ui/button';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { ProjectMarquee } from './project-marquee';
import { RecentlyLaunched } from './recently-launched';
import { useHomeLaunches } from './use-home-launches';

export function LaunchBrowser({ network = API_NETWORK }: { network?: ApiNetwork }) {
  const { query, launches, recent, loaded, total } = useHomeLaunches(network);

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <ProjectMarquee launches={launches} network={network} pending={query.isPending} />
      <RecentlyLaunched launches={recent} network={network} loaded={loaded} total={total} pending={query.isPending} failed={query.isError && !query.data} />

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
