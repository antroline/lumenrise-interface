import {
  auctions,
  launches,
  tradingTokens,
  type LaunchPhase,
} from '@/lib/data'
import type { ProjectMarkName } from '@/components/project-mark'

export type ProjectCategory = 'Launch' | 'Auction' | 'Trading'

export type ProjectListing = {
  id: string
  name: ProjectMarkName
  ticker: string
  href: string
  category: ProjectCategory
  phase: LaunchPhase
  figure: string
  figureContext: string
  figureValue: number
  participants: number | null
  date: string
  dateLabel: string
  dateValue: number
  model: string
  snapshot: string
  snapshotContext: string
  snapshotDirection?: 'up' | 'down'
}

const monthIndex: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

function dateValue(value: string) {
  const [month, day] = value.split(' · ')[0].split(' ')
  return (monthIndex[month] ?? 0) * 31 + Number(day ?? 0)
}

function numberValue(value: string) {
  return Number(value.replace(/[^\d.]/g, '')) || 0
}

function leadingNumber(value: string) {
  return Number(value.match(/^[\d,]+/)?.[0].replaceAll(',', '')) || 0
}

export const projects: ProjectListing[] = [
  ...launches.map((launch) => ({
    id: `launch-${launch.slug}`,
    name: launch.name,
    ticker: launch.ticker,
    href: `/launch/${launch.slug}`,
    category: 'Launch' as const,
    phase: launch.phase,
    figure: launch.phase === 'live' ? launch.raised : launch.target,
    figureContext: launch.phase === 'live' ? 'raised' : 'target',
    figureValue: numberValue(launch.phase === 'live' ? launch.raised : launch.target),
    participants: launch.participants === '—' ? null : numberValue(launch.participants),
    date: launch.date.split(' · ')[0],
    dateLabel: launch.dateLabel.toLowerCase(),
    dateValue: dateValue(launch.date),
    model: launch.model,
    snapshot: launch.phase === 'live' ? `${launch.progress}%` : launch.allocation,
    snapshotContext: launch.phase === 'live' ? 'of target funded' : 'allocation',
  })),
  ...auctions.map((auction) => ({
    id: `auction-${auction.slug}`,
    name: auction.name,
    ticker: auction.ticker,
    href: `/auction/${auction.slug}`,
    category: 'Auction' as const,
    phase: auction.phase,
    figure: auction.minBid,
    figureContext: 'min bid',
    figureValue: numberValue(auction.minBid),
    participants: auction.phase === 'live' ? leadingNumber(auction.bidders) : null,
    date: auction.time.split(' · ')[0],
    dateLabel: auction.timeLabel.toLowerCase(),
    dateValue: dateValue(auction.time),
    model: auction.model,
    snapshot: auction.range ? `${auction.range.low}–${auction.range.high} USDC` : auction.supply,
    snapshotContext: auction.range ? 'est. clearing' : 'supply',
  })),
  ...tradingTokens.map((token) => ({
    id: `trading-${token.slug}`,
    name: token.name,
    ticker: token.ticker,
    href: `/trade/${token.slug}`,
    category: 'Trading' as const,
    phase: 'launched' as const,
    figure: token.price,
    figureContext: 'price',
    figureValue: numberValue(token.price),
    participants: null,
    date: token.launched,
    dateLabel: 'launched',
    dateValue: dateValue(token.launched),
    model: 'Spot market',
    snapshot: token.change,
    snapshotContext: '24h change',
    snapshotDirection: token.direction,
  })),
]
