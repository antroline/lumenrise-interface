import { BackLink } from '@/components/page-header'
import type { Launch } from '@/lib/data'
import type { LaunchContent } from '../_data/launch-content'
import { CommitmentForm } from './commitment-form'
import { ParticipationHeader } from './participation-header'

export function ParticipationView({ launch, content }: { launch: Launch; content: LaunchContent }) {
  const live = launch.phase === 'live'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-12">
      <BackLink href={`/launch/${launch.slug}`}>{launch.name}</BackLink>
      <ParticipationHeader launch={launch} />

      <div className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[minmax(0,1fr)_280px]">
        <aside className="border-b bg-muted/40 p-5 sm:p-7 lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-l" aria-labelledby="terms-heading">
          <h2 id="terms-heading" className="text-title font-semibold">Before you continue</h2>
          <dl className="mt-5 divide-y text-ui">
            <div className="py-3 first:pt-0">
              <dt className="text-small text-muted-foreground">Sale {live ? 'ends' : 'opens'}</dt>
              <dd className="mt-1 font-medium">{launch.date}</dd>
            </div>
            <div className="py-3">
              <dt className="text-small text-muted-foreground">Allocation method</dt>
              <dd className="mt-1 font-medium">{launch.allocation}</dd>
            </div>
            <div className="py-3">
              <dt className="text-small text-muted-foreground">Reference requirement</dt>
              <dd className="mt-1 font-medium">{launch.requirement}</dd>
            </div>
            {content.unlockSummary && (
              <div className="py-3">
                <dt className="text-small text-muted-foreground">Token unlock</dt>
                <dd className="mt-1 font-medium">{content.unlockSummary}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-small text-muted-foreground">
            Wallet eligibility and balances are not verified in this preview.
          </p>
        </aside>

        {live ? (
          <CommitmentForm slug={launch.slug} />
        ) : (
          <section className="p-5 sm:p-7 lg:col-start-1 lg:row-start-1 lg:self-center" aria-labelledby="participation-heading">
            <h2 id="participation-heading" className="text-title font-semibold">Participation opens later</h2>
            <p className="mt-2 text-body text-muted-foreground">
              This round opens {launch.date}. You can review the terms now; commitments are not available yet.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
