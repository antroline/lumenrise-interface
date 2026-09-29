import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Launch } from '@/lib/data'

export function LaunchSummary({ launch }: { launch: Launch }) {
  const live = launch.phase === 'live'

  return (
    <section className="grid lg:grid-cols-[minmax(0,1fr)_300px]" aria-labelledby="sale-heading">
      <div className="px-5 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="sale-heading" className="text-[20px] font-semibold tracking-[-0.02em]">
              {live ? 'Live sale' : 'Upcoming sale'}
            </h2>
            <p className="mt-4 text-small text-white/60">{live ? 'Raised so far' : 'Fundraising target'}</p>
            <p className="mt-1 text-[38px] leading-none font-semibold tracking-[-0.035em] tabular-nums sm:text-[46px]">
              {live ? launch.raised : launch.target}
            </p>
          </div>
          {live && <p className="pb-1 text-small text-white/65 tabular-nums">of {launch.target} target</p>}
        </div>

        {live && (
          <div className="mt-6">
            <Progress
              value={launch.progress}
              aria-label={`${launch.progress}% of target raised`}
              size="thick"
              className="[&_[data-slot=progress-indicator]]:bg-orange [&_[data-slot=progress-track]]:bg-white/15"
            />
            <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-small text-white/70 tabular-nums">
              <span><strong className="font-semibold text-orange">{launch.progress}%</strong> funded</span>
              {launch.participants !== '—' && <span>{launch.participants} participants</span>}
            </div>
          </div>
        )}

        <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/10 pt-5 text-ui sm:grid-cols-3 sm:gap-x-8">
          <div>
            <dt className="text-small text-white/55">Sale {live ? 'ends' : 'opens'}</dt>
            <dd className="mt-1 font-medium">{launch.date}</dd>
          </div>
          <div>
            <dt className="text-small text-white/55">Allocation</dt>
            <dd className="mt-1 font-medium">{launch.allocation}</dd>
          </div>
          <div>
            <dt className="text-small text-white/55">Network</dt>
            <dd className="mt-1 font-medium">Stellar · Soroban</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-white/10 bg-white/5 px-5 py-7 sm:px-8 lg:border-t-0 lg:border-l lg:border-white/10 lg:px-6 lg:py-8">
        <h2 className="text-title font-semibold">Participation</h2>
        <p className="mt-4 text-small text-white/60">Reference requirement</p>
        <p className="mt-1 text-[15px] font-medium">{launch.requirement}</p>
        <Button className="mt-6 w-full" render={<Link href={`/launch/${launch.slug}/participate`} />} nativeButton={false}>
          {live ? 'Review participation' : 'View participation terms'}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <p className="mt-3 text-small leading-relaxed text-white/60">
          Testnet preview. Eligibility and transactions are not connected.
        </p>
      </div>
    </section>
  )
}
