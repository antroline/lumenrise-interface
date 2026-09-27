import Link from 'next/link'
import { ClearingRange } from '@/components/clearing-range'
import { ProjectMark } from '@/components/project-mark'
import { Label } from '@/components/stat'
import { Eligibility, SourceLabel, StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Auction } from '@/lib/data'
import { cn } from '@/lib/utils'

export function AuctionSummary({ auction }: { auction: Auction }) {
  const facts = [
    { label: 'For sale', value: auction.supply, className: 'font-semibold tabular-nums' },
    { label: 'Minimum bid', value: auction.minBid, className: 'font-semibold' },
    { label: auction.timeLabel, value: auction.time, className: 'font-mono text-ui font-medium' },
  ]

  return (
    <Card className="grid gap-6 px-6 py-[22px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <ProjectMark name={auction.name} size={44} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/auction/${auction.slug}`}
                className="text-title font-semibold tracking-[-0.02em] underline-offset-4 hover:underline"
              >
                {auction.name}
              </Link>
              <Badge variant="tag">{auction.ticker}</Badge>
            </div>
            <span className="text-small text-muted-foreground">{auction.model}</span>
          </div>
          <StatusPill status={auction.phase} className="ml-auto" />
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>
                <Label>{fact.label}</Label>
              </dt>
              <dd className={cn('mt-2', fact.className)}>{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3.5">
          <span className="text-small text-muted-foreground">{auction.bidders}</span>
          <Eligibility state={auction.eligibility.state}>{auction.eligibility.label}</Eligibility>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3 rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between">
          <Label>Clearing range</Label>
          <SourceLabel>Estimate</SourceLabel>
        </div>
        <div className="text-mid font-semibold tracking-[-0.02em] tabular-nums">
          {auction.range ? (
            <>
              {auction.range.low} – {auction.range.high}{' '}
              <span className="text-small font-normal text-muted-foreground">USDC</span>
            </>
          ) : (
            'Not started'
          )}
        </div>
        <ClearingRange band={auction.band} axis={auction.axis} />
      </div>
    </Card>
  )
}
