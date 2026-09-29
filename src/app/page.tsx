import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProjectsTable } from '@/components/projects-table'
import { Button } from '@/components/ui/button'
import {
  auctions,
  completedRaises,
  featuredLaunch,
  liveLaunches,
  tradingTokens,
  upcomingLaunches,
  type Auction,
  type CompletedRaise,
  type Eligibility,
  type Launch,
  type TradingToken,
} from '@/lib/data'
import type { ProjectTableRow } from '@/lib/project-table'
import { DiscoverResults } from './_discover/discover-results'
import { FeaturedLaunch } from './_discover/featured-launch'
import { parseView } from './_discover/views'

const DISCOVER_LIMIT = 5

type SearchParams = Promise<{
  view?: string;
  model?: string;
  eligible?: string;
}>;

function countValue(value: string) {
  const count = Number(value.match(/^[\d,]+/)?.[0].replaceAll(',', ''))
  return Number.isFinite(count) && count > 0 ? count : null
}

function launchRow(launch: Launch): ProjectTableRow {
  return {
    id: `launch-${launch.slug}`,
    name: launch.name,
    ticker: launch.ticker,
    href: `/launch/${launch.slug}`,
    category: 'Launch',
    phase: launch.phase,
    figure: launch.phase === 'live' ? launch.raised : launch.target,
    figureContext: launch.phase === 'live' ? 'raised' : 'target',
    participants: countValue(launch.participants),
    date: launch.date.split(' · ')[0],
    dateLabel: launch.dateLabel.toLowerCase(),
  };
}

function auctionRow(auction: Auction): ProjectTableRow {
  return {
    id: `auction-${auction.slug}`,
    name: auction.name,
    ticker: auction.ticker,
    href: `/auction/${auction.slug}`,
    category: 'Auction',
    phase: auction.phase,
    figure: auction.minBid,
    figureContext: 'min bid',
    participants: auction.phase === 'live' ? countValue(auction.bidders) : null,
    date: auction.time.split(' · ')[0],
    dateLabel: auction.timeLabel.toLowerCase(),
  };
}

function tradingRow(token: TradingToken): ProjectTableRow {
  return {
    id: `trading-${token.slug}`,
    name: token.name,
    ticker: token.ticker,
    href: `/trade/${token.slug}`,
    category: 'Trading',
    phase: 'launched',
    figure: token.price,
    figureContext: 'price',
    participants: null,
    date: token.launched,
    dateLabel: 'launched',
  };
}

function completedRow(raise: CompletedRaise): ProjectTableRow {
  return {
    id: `completed-${raise.title}`,
    name: raise.mark,
    title: raise.title,
    category: 'Launch',
    phase: raise.outcome === 'completed' ? 'completed' : 'refunded',
    figure: raise.raised,
    figureContext: 'raised',
    participants: countValue(raise.participants),
    date: raise.date,
  };
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const modelEntries =
    view === 'upcoming'
      ? upcomingLaunches
      : view === 'auction'
        ? auctions
        : liveLaunches;
  const models = [...new Set(modelEntries.map((entry) => entry.model))];
  const matches = (entry: { model: string; eligibility: Eligibility }) => {
    if (view === 'all') return true;
    return (
      (!params.model || entry.model === params.model) &&
      (params.eligible !== '1' || entry.eligibility.state === 'ok')
    );
  };

  const rows: ProjectTableRow[] = [
    ...(view === 'all' || view === 'live'
      ? liveLaunches.filter(matches).map(launchRow)
      : []),
    ...(view === 'all' || view === 'upcoming'
      ? upcomingLaunches.filter(matches).map(launchRow)
      : []),
    ...(view === 'all' || view === 'auction'
      ? auctions.filter(matches).map(auctionRow)
      : []),
    ...(view === 'all' || view === 'launched'
      ? tradingTokens.map(tradingRow)
      : []),
    ...(view === 'all' || view === 'completed'
      ? completedRaises.map(completedRow)
      : []),
  ];
  const shown = rows.slice(0, DISCOVER_LIMIT);

  return (
    <div className="max-w-5xl">
      <h1 className="text-[34px] leading-none font-bold tracking-[-0.04em] sm:text-h1">
        Launches
      </h1>

      <div className="mt-8">
        <FeaturedLaunch launch={featuredLaunch} />
      </div>

      <Suspense>
        <DiscoverResults
          view={view}
          models={models}
          hasResults={rows.length > 0}
          skeletonRows={shown.length || DISCOVER_LIMIT}
        >
          {rows.length > 0 && (
            <>
              <ProjectsTable
                rows={shown}
                caption={`${shown.length} of ${rows.length} ${rows.length === 1 ? 'project' : 'projects'}`}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="caps tabular-nums">
                  Showing {shown.length} of {rows.length} · Preview data
                </p>
                <Button variant="outline" size="sm" render={<Link href="/launches" />} nativeButton={false}>
                  View all projects
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </>
          )}
        </DiscoverResults>
      </Suspense>
    </div>
  );
}
