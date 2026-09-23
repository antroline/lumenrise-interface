export type LaunchStatus =
  | 'Live'
  | 'Upcoming'
  | 'Auction'
  | 'Recently launched'
  | 'Completed'

export type Launch = {
  slug: string
  name: string
  symbol: string
  description: string
  status: LaunchStatus
  raised: string
  target: string
  progress: number
  timingLabel: string
  timingValue: string
  date: string
  allocation: string
  allocationNote: string
  reputation: number | null
  participants: string
  action: string
  mark: 'star' | 'slash' | 'orbit' | 'hourglass' | 'arc' | 'flag'
}

export const launches: Launch[] = [
  {
    slug: 'meridian',
    name: 'Meridian',
    symbol: 'MDR',
    description: 'Open finance rails for cross-border settlement.',
    status: 'Live',
    raised: '$1,250,000',
    target: '$2,000,000',
    progress: 63,
    timingLabel: 'Closes in',
    timingValue: '2 days',
    date: 'Sep 24 · 12:00 UTC',
    allocation: 'Proportional',
    allocationNote: 'Based on total valid commitments.',
    reputation: 63,
    participants: '3,482',
    action: 'Participate',
    mark: 'star',
  },
  {
    slug: 'northstar-compute',
    name: 'Northstar Compute',
    symbol: 'NST',
    description: 'Verifiable compute for open infrastructure.',
    status: 'Live',
    raised: '$480,000',
    target: '$800,000',
    progress: 60,
    timingLabel: 'Closes in',
    timingValue: '5 days',
    date: 'Sep 27 · 16:00 UTC',
    allocation: 'Fixed allocation',
    allocationNote: 'Equal allocation for eligible participants.',
    reputation: 48,
    participants: '1,906',
    action: 'Participate',
    mark: 'slash',
  },
  {
    slug: 'luma-commons',
    name: 'Luma Commons',
    symbol: 'LUMA',
    description: 'Community-owned tools for independent creators.',
    status: 'Auction',
    raised: '$320,000',
    target: '$1,000,000',
    progress: 32,
    timingLabel: 'Auction ends in',
    timingValue: '1 day',
    date: 'Sep 23 · 18:00 UTC',
    allocation: 'Dutch auction',
    allocationNote: 'Uniform clearing price at settlement.',
    reputation: 55,
    participants: '2,311',
    action: 'View auction',
    mark: 'orbit',
  },
  {
    slug: 'helix-markets',
    name: 'Helix Markets',
    symbol: 'HLX',
    description: 'Modular rails for tokenized real-world assets.',
    status: 'Upcoming',
    raised: '$0',
    target: '$1,500,000',
    progress: 0,
    timingLabel: 'Opens in',
    timingValue: '6 days',
    date: 'Sep 28 · 12:00 UTC',
    allocation: 'Reputation weighted',
    allocationNote: 'Caps increase with eligible credentials.',
    reputation: 70,
    participants: '—',
    action: 'Opens soon',
    mark: 'hourglass',
  },
  {
    slug: 'kepler-studio',
    name: 'Kepler Studio',
    symbol: 'KPL',
    description: 'On-chain publishing tools for research collectives.',
    status: 'Recently launched',
    raised: '$640,000',
    target: '$640,000',
    progress: 100,
    timingLabel: 'Launched',
    timingValue: '8 days ago',
    date: 'Sep 14 · 09:00 UTC',
    allocation: 'Community round',
    allocationNote: 'Vested over six months after claim.',
    reputation: null,
    participants: '4,208',
    action: 'View token',
    mark: 'arc',
  },
  {
    slug: 'aurora-data',
    name: 'Aurora Data',
    symbol: 'AUR',
    description: 'Public data infrastructure for a transparent web.',
    status: 'Completed',
    raised: '$750,000',
    target: '$750,000',
    progress: 100,
    timingLabel: 'Completed',
    timingValue: 'Apr 10',
    date: '12:00 UTC',
    allocation: 'Fixed allocation',
    allocationNote: 'Claims remain open for participants.',
    reputation: 42,
    participants: '5,284',
    action: 'View results',
    mark: 'flag',
  },
]

export const filterLabels: Array<'All' | LaunchStatus> = [
  'All',
  'Live',
  'Upcoming',
  'Auction',
  'Recently launched',
  'Completed',
]
