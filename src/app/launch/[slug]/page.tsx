import { notFound } from 'next/navigation'
import { BackLink } from '@/components/page-header'
import { Trajectory } from '@/components/visual-system'
import { getLaunch } from '@/lib/data'
import { LaunchExtraSections } from './_components/launch-extra-sections'
import { LaunchHeader } from './_components/launch-header'
import { LaunchSummary } from './_components/launch-summary'
import { getLaunchContent } from './_data/launch-content'

export default async function LaunchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const launch = getLaunch(slug)
  if (!launch) notFound()

  const content = getLaunchContent(slug)
  const hasExtraContent = Boolean(content.overview || content.team || content.evidence || content.tokenomics || content.updates)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12 sm:gap-8">
      <BackLink href="/">Discover</BackLink>
      <div className="dark overflow-hidden rounded-2xl bg-ink text-foreground ring-1 ring-white/10 dark:bg-panel">
        <LaunchHeader launch={launch} />
        <LaunchSummary launch={launch} />
        <div className="border-t border-white/10 px-5 py-5 sm:px-8 sm:py-6">
          <Trajectory
            label="Launch progression"
            active={launch.phase === 'live' ? 1 : 0}
            steps={[
              { label: 'Announced' },
              { label: 'Live sale' },
              { label: 'Settlement' },
              { label: 'Trading & claims' },
            ]}
          />
        </div>
      </div>

      {hasExtraContent && <LaunchExtraSections content={content} />}
    </div>
  )
}
