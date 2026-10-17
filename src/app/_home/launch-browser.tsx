'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { ProjectsTable, ProjectsTableSkeleton } from '@/components/projects-table';
import { compactAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import type { ProjectPhase, ProjectTableRow } from '@/lib/project-table';
import { useHomeLaunches, type HomeLaunch } from './use-home-launches';

const SHOWN = 5;

type Filter = 'open' | 'scheduled' | 'graduated' | 'all';

const empty: Record<Filter, string> = {
  open: 'Nothing is trading right now.',
  scheduled: 'Nothing is scheduled to open.',
  graduated: 'No launch has graduated yet.',
  all: 'No launches on this network yet.',
};

function LaunchTablePreview({ launches, network, filter }: { launches: HomeLaunch[]; network: ApiNetwork; filter: Filter }) {
  if (!launches.length)
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-foreground/15 px-6 py-10 text-center">
        <p className="text-[14px] text-muted-foreground">{empty[filter]}</p>
        <Button variant="outline" size="sm" render={<Link href="/create" />} nativeButton={false}>
          Create a launch
        </Button>
      </div>
    );
  const phases = {
    Open: 'live',
    Scheduled: 'upcoming',
    Graduated: 'launched',
    Failed: 'failed',
  } satisfies Record<HomeLaunch['bonding']['status'], ProjectPhase>;
  const rows: ProjectTableRow[] = launches.slice(0, SHOWN).map((launch) => {
    const b = launch.bonding;
    const pair = pairLabel(launch.pair, network);
    return {
      id: `${network}:${launch.contractId}`,
      name: launch.metadata.name,
      ticker: launch.metadata.symbol,
      logo: launch.metadata.logo,
      href: `/launch/${launch.contractId}?network=${network}`,
      category: 'Bonding Curve',
      phase: phases[b.status],
      graduation: {
        target: `${compactAmount(b.curve.graduationTarget)} ${pair}`,
        progressBps: b.progressBps,
        stale: b.stateStale,
      },
      figure: `${compactAmount(b.state.quoteReserve)} ${pair}`,
      figureContext: '',
      participants: b.state.buyerCount,
      date: unixDate(b.status === 'Scheduled' ? b.startsAt : b.endsAt),
      dateLabel: b.status === 'Scheduled' ? 'opens' : 'ends',
    };
  });
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border-2 border-orange/50 [&_td]:border-orange/15 bg-card [&_th]:bg-orange/10 [&_th]:text-orange-800 dark:[&_th]:bg-orange/15 dark:[&_th]:text-orange-300 [&_table]:text-sm [&_td:first-child_img]:size-8! [&_td:first-child_svg]:size-8 [&_td:first-child_.truncate]:text-[15px] shadow-[0_2px_6px_-3px_rgb(24_24_12/0.08)] dark:bg-muted dark:shadow-[0_2px_6px_-3px_rgb(0_0_0/0.18)]">
      <div className="pb-10 [mask-image:linear-gradient(to_bottom,black_0%,black_65%,transparent_100%)] focus-within:[mask-image:none]">
        <ProjectsTable directory rows={rows} figureLabel="Pool Balance" caption="Launch preview on the selected network" />
      </div>
      <div className="relative -mt-10 flex justify-center px-4 pb-5">
        <Button render={<Link href={`/launches?network=${network}`} />} nativeButton={false}>
          View all launches
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

export function LaunchBrowser({ network }: { network: ApiNetwork }) {
  const { query, total, loaded, open, scheduled, graduated, failed } = useHomeLaunches(network);
  const [chosen, setChosen] = useState<Filter | null>(null);
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
      <Tabs
          value={filter}
          onValueChange={(value) => setChosen(tabs.find((tab) => tab.value === value)?.value ?? null)}
          className="gap-4"
        >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="browse-heading" className="text-[22px] sm:text-[24px] leading-tight font-semibold tracking-[-0.03em]">
          Launches
        </h2>
        <div className="ml-auto max-w-full overflow-x-auto [scrollbar-width:none]">
            <TabsList aria-label="Launch status" className="bg-foreground/[0.06] dark:bg-secondary">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 group-data-[variant=default]/tabs-list:h-8 group-data-[variant=default]/tabs-list:px-3">
                  {tab.label}
                  <span className="text-[11.5px] text-muted-foreground tabular-nums">{groups[tab.value].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
      </div>
      {query.isPending ? (
        <div aria-busy="true" aria-label="Loading launches" className="overflow-hidden rounded-2xl border-2 border-orange/50 [&_td]:border-orange/15 bg-card [&_th]:bg-orange/10 [&_th]:text-orange-800 dark:[&_th]:bg-orange/15 dark:[&_th]:text-orange-300 [&_table]:text-sm [&_td:first-child_img]:size-8! [&_td:first-child_svg]:size-8 [&_td:first-child_.truncate]:text-[15px] shadow-[0_2px_6px_-3px_rgb(24_24_12/0.08)] dark:shadow-[0_2px_6px_-3px_rgb(0_0_0/0.18)]">
          <ProjectsTableSkeleton rows={SHOWN} directory figureLabel="Pool Balance" />
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
        <>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <LaunchTablePreview launches={groups[tab.value]} network={network} filter={tab.value} />
            </TabsContent>
          ))}
          {total > loaded && (
            <p className="text-[12px] text-muted-foreground tabular-nums">
              Counts cover the first {loaded} of {total.toLocaleString('en-US')} indexed launches.
            </p>
          )}
        </>
      )}
        </Tabs>
    </section>
  );
}
