import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReputationSignalMap } from './reputation-signal-map'

export const metadata: Metadata = { title: 'My Reputation' }

export default function ReputationPage() {
  return (
    <section className="grid min-h-[min(68svh,680px)] items-center gap-10 border-y border-divider py-10 sm:py-14 md:gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 xl:gap-20">
      <div className="max-w-xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-big font-semibold tracking-[-0.035em] text-balance sm:text-display">My Reputation</h1>
          <Badge variant="soft">Coming soon</Badge>
        </div>
        <p className="mt-4 max-w-[52ch] text-base leading-[1.65] text-muted-foreground">
          Your reputation goes beyond a single score. On-chain activity, ecosystem contributions, and connected accounts will form a multidimensional reputation profile, helping projects define eligibility and participation rules.
        </p>
        <Button variant="dark" className="mt-7" render={<Link href="/" />} nativeButton={false}>
          Explore launches
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div className="mx-auto w-full max-w-[560px] lg:max-w-none">
        <ReputationSignalMap />
      </div>
    </section>
  )
}
