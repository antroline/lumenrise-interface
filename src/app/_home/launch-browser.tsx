'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { LaunchCard, LaunchCardSkeleton } from './launch-card';
import { useHomeLaunches, type HomeLaunch } from './use-home-launches';

const SHOWN = 6;
const grid = 'grid gap-4 md:grid-cols-2 2xl:grid-cols-3';

type Filter = 'open' | 'scheduled' | 'graduated' | 'all';

const empty: Record<Filter, string> = {
  open: 'Nothing is trading right now.',
  scheduled: 'Nothing is scheduled to open.',
  graduated: 'No launch has graduated yet.',
  all: 'No launches on this network yet.',
};

function Grid({ launches, network, filter, now }: { launches: HomeLaunch[]; network: ApiNetwork; filter: Filter; now: number }) {
  if (!launches.length)
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-foreground/15 px-6 py-10 text-center">
        <p className="text-[14px] text-muted-foreground">{empty[filter]}</p>
        <Button variant="outline" size="sm" render={<Link href="/create" />} nativeButton={false}>
          Create a launch
        </Button>
      </div>
    );
  return (
    <ul className={grid}>
      {launches.slice(0, SHOWN).map((launch) => (
        <li key={launch.contractId} className="flex *:w-full">
          <LaunchCard launch={launch} network={network} now={now} />
        </li>
      ))}
    </ul>
  );
}

export function LaunchBrowser({ network }: { network: ApiNetwork }) {
  const { query, total, loaded, open, scheduled, graduated, failed } = useHomeLaunches(network);
  const [chosen, setChosen] = useState<Filter | null>(null);
  const [now] = useState(() => Date.now());
  const groups: Record<Filter, HomeLaunch[]> = {
    open,
    scheduled,
    graduated,
    all: [...open, ...scheduled, ...graduated, ...failed],
  };
  // Until the visitor picks a tab, lead with live trading, or with everything when nothing is open.
  const filter = chosen ?? (open.length ? 'open' : 'all');
  const tabs: { value: Filter; label: string }[] = [
    { value: 'open', label: 'Trading' },
    { value: 'scheduled', label: 'Upcoming' },
    { value: 'graduated', label: 'Graduated' },
    { value: 'all', label: 'All' },
  ];

  return (
    <section aria-labelledby="browse-heading">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="browse-heading" className="text-[19px] leading-tight font-semibold tracking-[-0.03em]">
          Launches
        </h2>
        <Link
          href={`/launches?network=${network}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {total > 0 ? `View all ${total.toLocaleString('en-US')}` : 'View all'}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {query.isPending ? (
        <div aria-busy="true" aria-label="Loading launches" className={grid}>
          {Array.from({ length: 4 }, (_, index) => (
            <LaunchCardSkeleton key={index} />
          ))}
        </div>
      ) : query.isError ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-foreground/15 px-6 py-10 text-center">
          <p className="text-[14px] font-medium">Launches could not be loaded.</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">{query.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      ) : (
        <Tabs
          value={filter}
          onValueChange={(value) => setChosen(tabs.find((tab) => tab.value === value)?.value ?? null)}
          className="gap-4"
        >
          <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:max-w-full sm:px-0">
            <TabsList aria-label="Launch status" className="bg-foreground/[0.06] dark:bg-secondary">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 group-data-[variant=default]/tabs-list:h-8 group-data-[variant=default]/tabs-list:px-3">
                  {tab.label}
                  <span className="text-[11.5px] text-muted-foreground tabular-nums">{groups[tab.value].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <Grid launches={groups[tab.value]} network={network} filter={tab.value} now={now} />
            </TabsContent>
          ))}
          {total > loaded && (
            <p className="text-[12px] text-muted-foreground tabular-nums">
              Counts cover the first {loaded} of {total.toLocaleString('en-US')} indexed launches.
            </p>
          )}
        </Tabs>
      )}
    </section>
  );
}
