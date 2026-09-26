import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight, SearchX } from 'lucide-react'
import { LaunchCard } from '@/components/launch-card'
import { PageHeader, SectionHeader, TextLink } from '@/components/page-header'
import { Stat } from '@/components/stat'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  auctions,
  completedRaises,
  discoverCounts,
  featuredLaunch,
  liveLaunches,
  tradingTokens,
  upcomingLaunches,
  type Eligibility,
} from '@/lib/data'
import { AuctionSummary } from './_discover/auction-summary'
import { DiscoverFilters } from './_discover/discover-filters'
import { FeaturedLaunch } from './_discover/featured-launch'
import { CompletedTable, RecentlyLaunchedTable } from './_discover/market-tables'
import { parseView } from './_discover/views'

type SearchParams = Promise<{ view?: string; model?: string; eligible?: string }>

const models = [...new Set([...liveLaunches, ...upcomingLaunches, ...auctions].map((entry) => entry.model))]

function ViewAll({ view, count }: { view: string; count?: number }) {
  return (
    <TextLink href={`/?view=${view}`}>
      View all{count ? ` ${count}` : ''}
      <ArrowRight aria-hidden="true" />
    </TextLink>
  )
}

function NoMatches() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>No launches match these filters</EmptyTitle>
        <EmptyDescription>Try another allocation model or turn off “Eligible for me”.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" render={<Link href="/" />} nativeButton={false}>
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const view = parseView(params.view)
  const matches = (entry: { model: string; eligibility: Eligibility }) =>
    (!params.model || entry.model === params.model) && (params.eligible !== '1' || entry.eligibility.state === 'ok')

  const live = liveLaunches.filter(matches)
  const upcoming = upcomingLaunches.filter(matches)
  const auctionList = auctions.filter(matches)
  const shows = (section: typeof view) => view === 'all' || view === section

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Launches on Stellar"
        description="Every raise on LumenRise, with its rules, its evidence and whether your connected wallet qualifies."
        actions={
          <div className="grid grid-cols-2 gap-6 pb-1.5 sm:flex sm:gap-8">
            <Stat tone="plain" label="Live now" value={discoverCounts.live} />
            <Stat tone="plain" label="Upcoming" value={discoverCounts.upcoming} />
            <Stat tone="plain" label="Auctions" value={discoverCounts.auction} />
            <Stat tone="plain" label="Participants · 30d" value={discoverCounts.participants30d} />
          </div>
        }
      />

      <div className="mt-8">
        <FeaturedLaunch launch={featuredLaunch} />
      </div>

      <div className="mt-10">
        <Suspense>
          <DiscoverFilters view={view} models={models} />
        </Suspense>
      </div>

      {shows('live') && (
        <section className="mt-8">
          <SectionHeader title="Live" description="Open for commitments now." action={<ViewAll view="live" count={discoverCounts.live} />} />
          {live.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {live.map((launch) => (
                <LaunchCard key={launch.slug} launch={launch} />
              ))}
            </div>
          ) : (
            <NoMatches />
          )}
        </section>
      )}

      {shows('auction') && (
        <section className="mt-12">
          <SectionHeader
            title="Auction"
            description="Price is discovered by bids. Final price and allocations are set by the contract at settlement."
            action={<ViewAll view="auction" count={discoverCounts.auction} />}
          />
          {auctionList.length ? (
            <div className="grid gap-4">
              {auctionList.map((auction) => (
                <AuctionSummary key={auction.slug} auction={auction} />
              ))}
            </div>
          ) : (
            <NoMatches />
          )}
        </section>
      )}

      {shows('upcoming') && (
        <section className="mt-12">
          <SectionHeader
            title="Upcoming"
            description="Eligibility is checked now so you know before the launch opens."
            action={<ViewAll view="upcoming" count={discoverCounts.upcoming} />}
          />
          {upcoming.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((launch) => (
                <LaunchCard key={launch.slug} launch={launch} />
              ))}
            </div>
          ) : (
            <NoMatches />
          )}
        </section>
      )}

      {(shows('launched') || shows('completed')) && (
        <div className="mt-12 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          {shows('launched') && (
            <section className={view === 'launched' ? 'min-w-0 xl:col-span-2' : 'min-w-0'}>
              <SectionHeader
                title="Recently launched"
                description="Tokens now trading through Stellar liquidity."
                action={<ViewAll view="launched" />}
              />
              <RecentlyLaunchedTable tokens={tradingTokens} />
            </section>
          )}
          {shows('completed') && (
            <section className={view === 'completed' ? 'min-w-0 xl:col-span-2' : 'min-w-0'}>
              <SectionHeader
                title="Completed"
                description="Closed raises and their outcome."
                action={<ViewAll view="completed" count={discoverCounts.completed} />}
              />
              <CompletedTable raises={completedRaises} />
            </section>
          )}
        </div>
      )}
    </>
  )
}
