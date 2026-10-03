import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { BackLink } from '@/components/page-header'
import { cardVariants } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trajectory } from '@/components/visual-system'
import { getLaunch } from '@/lib/data'
import { LaunchExtraSections } from './_components/launch-extra-sections'
import { LaunchSummary } from './_components/launch-summary'
import { getLaunchContent } from './_data/launch-content'

const panel = cardVariants({ variant: 'surface', size: 'lg' })

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-2.5 text-[20px] leading-tight font-semibold tracking-[-0.02em] tabular-nums sm:text-[22px]">
        {children}
      </dd>
    </div>
  )
}

export default async function LaunchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const launch = getLaunch(slug)
  if (!launch) notFound()

  const content = getLaunchContent(slug)
  const live = launch.phase === 'live'

  return (
    <div className="w-full pb-8">
      {/* The shell breadcrumb already carries this link from md up. */}
      <div className="md:hidden">
        <BackLink href="/">Discover</BackLink>
      </div>
      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(358px,400px)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_462px]">
        <LaunchSummary
          launch={launch}
          content={content}
          className="lg:sticky lg:top-[84px] lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100svh-104px)] lg:overflow-y-auto lg:overscroll-contain"
        />

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <section className={panel} aria-labelledby="sale-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 id="sale-heading" className="text-[22px] font-semibold tracking-[-0.025em] sm:text-[25px]">
                {live ? 'Live sale' : 'Upcoming sale'}
              </h2>
              <p className="text-[15px] text-muted-foreground">
                {live ? 'Figures update as commitments settle' : 'No commitments accepted yet'}
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <p className="min-w-0">
                <span className="block text-[clamp(2.75rem,5vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] tabular-nums">
                  {live ? launch.raised : launch.target}
                </span>
                <span className="mt-3 block text-[17px] text-muted-foreground tabular-nums">
                  {live ? `raised of ${launch.target} target` : 'fundraising target'}
                </span>
              </p>
              {live && (
                <p className="flex items-baseline gap-2.5">
                  <span className="text-[38px] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:text-[44px]">
                    {launch.progress}%
                  </span>
                  <span className="text-[17px] text-muted-foreground">
                    {launch.progress >= 100 ? 'of target, oversubscribed' : 'funded'}
                  </span>
                </p>
              )}
            </div>

            {live && (
              <Progress
                value={launch.progress}
                aria-label={`${launch.progress}% of the target raised`}
                size="thick"
                className="[&_[data-slot=progress-track]]:bg-foreground/15"
              />
            )}

            <dl className="grid grid-cols-2 gap-x-8 gap-y-7 border-t border-divider pt-7 sm:grid-cols-4">
              <Figure label={`Sale ${launch.dateLabel.toLowerCase()}`}>{launch.date}</Figure>
              <Figure label="Allocation">{launch.allocation}</Figure>
              <Figure label="Model">{launch.model}</Figure>
              <Figure label="Participants">{launch.participants === '—' ? 'None yet' : launch.participants}</Figure>
            </dl>

            <div className="border-t border-divider pt-7">
              <h3 className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Launch progression
              </h3>
              <Trajectory
                className="mt-5 -mx-6 px-6 sm:mx-0 sm:px-0"
                size="lg"
                label="Launch progression"
                active={live ? 1 : 0}
                steps={[
                  { label: 'Announced' },
                  { label: 'Live sale', detail: `${launch.dateLabel} ${launch.date}` },
                  { label: 'Settlement' },
                  { label: 'Trading & claims' },
                ]}
              />
            </div>
          </section>

          <LaunchExtraSections content={content} />
        </div>
      </div>
    </div>
  )
}
