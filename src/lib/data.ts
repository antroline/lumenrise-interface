import type { ProjectMarkName } from '@/components/project-mark'

export type LaunchPhase = 'live' | 'upcoming' | 'auction' | 'launched' | 'completed' | 'settling'

export type EligibilityState = 'ok' | 'no' | 'part' | 'na'

export type Eligibility = { state: EligibilityState; label?: string }

export type Launch = {
  slug: string
  name: ProjectMarkName
  ticker: string
  phase: 'live' | 'upcoming'
  model: string
  description: string
  raised: string
  target: string
  progress: number
  dateLabel: 'Ends' | 'Opens'
  date: string
  participants: string
  allocation: string
  requirement: string
  eligibility: Eligibility
}

export const featuredLaunch: Launch = {
  slug: 'northstar',
  name: 'Northstar',
  ticker: 'NSTR',
  phase: 'live',
  model: 'Community round',
  description: 'Coordination tools for open communities, built on Stellar.',
  raised: '$312,480',
  target: '$420,000',
  progress: 74,
  dateLabel: 'Ends',
  date: 'Sep 29 · 14:00 UTC',
  participants: '3,240',
  allocation: 'Reputation-weighted',
  requirement: 'Stellar activity ≥ 40',
  eligibility: { state: 'ok' },
}

export const liveLaunches: Launch[] = [
  {
    slug: 'commons',
    name: 'Commons',
    ticker: 'CMNS',
    phase: 'live',
    model: 'Community round',
    description: 'Funding rails for public goods and shared infrastructure on Soroban.',
    raised: '$186,200',
    target: '$250,000',
    progress: 74,
    dateLabel: 'Ends',
    date: 'Sep 29 · 16:00 UTC',
    participants: '1,904',
    allocation: 'Quadratic',
    requirement: 'Level 2+',
    eligibility: { state: 'ok' },
  },
  {
    slug: 'flowstate',
    name: 'Flowstate',
    ticker: 'FLOW',
    phase: 'live',
    model: 'Fixed price',
    description: 'Streaming payments and payroll for DAOs and remote teams on Stellar.',
    raised: '$98,400',
    target: '$300,000',
    progress: 33,
    dateLabel: 'Ends',
    date: 'Oct 03 · 12:00 UTC',
    participants: '812',
    allocation: 'Fixed · 0.05 USDC',
    requirement: 'None',
    eligibility: { state: 'ok' },
  },
  {
    slug: 'aster',
    name: 'Aster',
    ticker: 'ASTR',
    phase: 'live',
    model: 'Proportional',
    description: 'Open data oracle for real-world asset prices anchored on Stellar.',
    raised: '$512,900',
    target: '$400,000',
    progress: 100,
    dateLabel: 'Ends',
    date: 'Sep 27 · 20:00 UTC',
    participants: '4,118',
    allocation: 'Pro-rata, oversubscribed',
    requirement: 'Developer ≥ 50',
    eligibility: { state: 'no', label: 'Needs Developer 50 · you 32' },
  },
]

export const upcomingLaunches: Launch[] = [
  {
    slug: 'tidewell',
    name: 'Tidewell',
    ticker: 'TIDE',
    phase: 'upcoming',
    model: 'Reputation-based',
    description: 'Savings vaults for stablecoin remittances across Stellar anchors.',
    raised: '$0',
    target: '$350,000',
    progress: 0,
    dateLabel: 'Opens',
    date: 'Oct 06 · 14:00 UTC',
    participants: '—',
    allocation: 'Reputation-weighted',
    requirement: 'Stellar activity ≥ 40',
    eligibility: { state: 'ok' },
  },
  {
    slug: 'vessel',
    name: 'Vessel',
    ticker: 'VSL',
    phase: 'upcoming',
    model: 'Private / community',
    description: 'Self-custody smart wallet with passkeys and social recovery.',
    raised: '$0',
    target: '$200,000',
    progress: 0,
    dateLabel: 'Opens',
    date: 'Oct 10 · 15:00 UTC',
    participants: '—',
    allocation: 'Allowlist + cap',
    requirement: 'Credential: Vessel beta',
    eligibility: { state: 'part', label: 'Missing 1 credential' },
  },
  {
    slug: 'lattice',
    name: 'Lattice',
    ticker: 'LTCE',
    phase: 'upcoming',
    model: 'Fixed price',
    description: 'Indexing and query layer for Soroban contract events.',
    raised: '$0',
    target: '$500,000',
    progress: 0,
    dateLabel: 'Opens',
    date: 'Oct 14 · 13:00 UTC',
    participants: '—',
    allocation: 'Fixed · 0.12 USDC',
    requirement: 'Wallet age ≥ 90 days',
    eligibility: { state: 'ok' },
  },
]

export const launches: Launch[] = [featuredLaunch, ...liveLaunches, ...upcomingLaunches]

export function getLaunch(slug: string) {
  return launches.find((launch) => launch.slug === slug)
}

export type Auction = {
  slug: string
  name: ProjectMarkName
  ticker: string
  phase: 'live' | 'upcoming'
  model: string
  supply: string
  minBid: string
  timeLabel: 'Ends' | 'Starts'
  time: string
  bidders: string
  eligibility: Eligibility
  /** Estimated clearing range; `null` before the auction opens. */
  range: { low: string; high: string } | null
  /** Clearing band as percentages of the price axis. */
  band: [number, number] | null
  axis: [string, string]
}

export const auctions: Auction[] = [
  {
    slug: 'meridian',
    name: 'Meridian',
    ticker: 'MRDN',
    phase: 'live',
    model: 'Uniform-price batch auction',
    supply: '3,240,000 MRDN',
    minBid: '0.10 USDC',
    timeLabel: 'Ends',
    time: 'Sep 30 · 18:00 UTC',
    bidders: '1,284 bidders · 2,019 bids',
    eligibility: { state: 'ok' },
    range: { low: '0.28', high: '0.34' },
    band: [52, 68],
    axis: ['0.10', '0.50'],
  },
  {
    slug: 'harbor',
    name: 'Harbor',
    ticker: 'HBRX',
    phase: 'upcoming',
    model: 'Descending-price auction',
    supply: '1,500,000 HBRX',
    minBid: '0.20 USDC',
    timeLabel: 'Starts',
    time: 'Oct 08 · 16:00 UTC',
    bidders: 'Registration open · 418 registered',
    eligibility: { state: 'ok' },
    range: null,
    band: null,
    axis: ['0.20', '0.80'],
  },
]

export function getAuction(slug: string) {
  return auctions.find((auction) => auction.slug === slug)
}

export type TradingToken = {
  slug: string
  name: ProjectMarkName
  ticker: string
  launched: string
  price: string
  change: string
  direction: 'up' | 'down'
  seed: number
}

export const tradingTokens: TradingToken[] = [
  { slug: 'orbit', name: 'Orbit', ticker: 'ORBT', launched: 'Sep 18', price: '$0.0612', change: '+8.4%', direction: 'up', seed: 1 },
  { slug: 'kiln', name: 'Kiln', ticker: 'KILN', launched: 'Sep 11', price: '$0.2140', change: '−3.1%', direction: 'down', seed: 2 },
  { slug: 'harbor', name: 'Harbor', ticker: 'HBR', launched: 'Sep 02', price: '$0.5530', change: '+21.7%', direction: 'up', seed: 3 },
  { slug: 'contour', name: 'Contour', ticker: 'CNTR', launched: 'Aug 27', price: '$0.0931', change: '+1.2%', direction: 'up', seed: 4 },
]

export function getTradingToken(slug: string) {
  return tradingTokens.find((token) => token.slug === slug)
}

export type CompletedRaise = {
  title: string
  mark: ProjectMarkName
  date: string
  raised: string
  participants: string
  outcome: 'completed' | 'refunded'
}

export const completedRaises: CompletedRaise[] = [
  { title: 'Aster Genesis', mark: 'Aster', date: 'Aug 14', raised: '$240,000', participants: '2,410', outcome: 'completed' },
  { title: 'Kiln seed', mark: 'Kiln', date: 'Aug 02', raised: '$180,000', participants: '1,322', outcome: 'completed' },
  { title: 'Orbit round 1', mark: 'Orbit', date: 'Jul 21', raised: '$96,300', participants: '688', outcome: 'refunded' },
  { title: 'Contour public', mark: 'Contour', date: 'Jul 09', raised: '$410,000', participants: '3,907', outcome: 'completed' },
]

export const discoverCounts = {
  all: 71,
  live: 4,
  upcoming: 9,
  auction: 2,
  launched: 6,
  completed: 50,
  participants30d: '18,402',
}
