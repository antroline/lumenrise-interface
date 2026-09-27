export type CategoryIcon = 'stellar' | 'code' | 'users' | 'vote' | 'wallet' | 'fingerprint'

export type SignalItem = {
  done: boolean
  text: string
}

export type ReputationCategory = {
  key: string
  icon: CategoryIcon
  value: number
  level: 'Strong' | 'Moderate' | 'Low' | 'Low risk'
  source: string
  updated: string
  inferred?: boolean
  sybil?: boolean
  items: SignalItem[]
}

export const profile = {
  name: 'nova.xlm',
  address: 'GDNA7X6K',
  addressShort: 'GDNA…7X6K',
  memberSince: 'Jan 2024',
  visibility: 'Public · 5 of 6 categories shown',
  tags: ['Builder', 'Governance voter', 'Early participant'],
  level: 4,
  levelMax: 6,
  levelName: 'Ecosystem contributor',
  nextLevelProgress: 62,
  pointsToNext: 140,
}

export const categories: ReputationCategory[] = [
  {
    key: 'Stellar activity',
    icon: 'stellar',
    value: 82,
    level: 'Strong',
    source: 'Horizon · 2 wallets',
    updated: '2 min ago',
    items: [
      { done: true, text: '1,204 transactions over 3 years' },
      { done: true, text: 'Used 9 Soroban contracts' },
      { done: true, text: 'Held 14 assets with trustlines' },
      { done: false, text: 'Provide liquidity to a pool' },
    ],
  },
  {
    key: 'Developer',
    icon: 'code',
    value: 32,
    level: 'Low',
    source: 'GitHub · novabuilder',
    updated: '1 h ago',
    items: [
      { done: true, text: '4 public repositories' },
      { done: true, text: 'Commits to 1 Stellar repo' },
      { done: false, text: 'Deploy a Soroban contract' },
      { done: false, text: 'Merged PR to an ecosystem project' },
    ],
  },
  {
    key: 'Social',
    icon: 'users',
    value: 64,
    level: 'Moderate',
    source: 'X · Discord · Telegram',
    updated: '6 h ago',
    items: [
      { done: true, text: 'X account older than 2 years' },
      { done: true, text: 'Member of 6 Stellar communities' },
      { done: true, text: 'Telegram verified' },
      { done: false, text: 'Connect Farcaster' },
    ],
  },
  {
    key: 'Ecosystem participation',
    icon: 'vote',
    value: 71,
    level: 'Strong',
    source: 'LumenRise · Stellar governance',
    updated: '1 d ago',
    items: [
      { done: true, text: 'Joined 5 launches' },
      { done: true, text: 'Voted in 3 governance rounds' },
      { done: true, text: 'Completed 12 missions' },
      { done: false, text: 'Hold a project credential' },
    ],
  },
  {
    key: 'Wallet history',
    icon: 'wallet',
    value: 88,
    level: 'Strong',
    source: 'Horizon · primary wallet',
    updated: '2 min ago',
    items: [
      { done: true, text: 'Oldest wallet: 3 y 2 mo' },
      { done: true, text: 'Regular activity in 30 of 36 months' },
      { done: true, text: 'No failed-claim patterns' },
      { done: true, text: 'Funded by a known anchor' },
    ],
  },
  {
    key: 'Sybil risk',
    icon: 'fingerprint',
    value: 9,
    level: 'Low risk',
    source: 'LumenRise Sybil model v3',
    updated: '1 d ago',
    inferred: true,
    sybil: true,
    items: [
      { done: true, text: 'No shared funding source with other profiles' },
      { done: true, text: 'Accounts show independent timing' },
      { done: true, text: 'Linked accounts belong to one person' },
      { done: false, text: 'Optional: verify a unique credential' },
    ],
  },
]

export const radarLabels = ['Stellar', 'Developer', 'Social', 'Ecosystem', 'Wallet', 'Sybil resist.']
export const radarValues = categories.map((category) => (category.sybil ? 100 - category.value : category.value))

export type AccountIcon = 'stellar' | 'github' | 'xlogo' | 'discord' | 'telegram' | 'farcaster'

export type ConnectedAccount = {
  key: string
  icon: AccountIcon
  name: string
  handle: string
  connected: boolean
  emphasized: boolean
  mono: boolean
  categories: string
}

export const accounts: ConnectedAccount[] = [
  { key: 'wallet-primary', icon: 'stellar', name: 'Stellar wallet', handle: 'GDNA…7X6K · primary', connected: true, emphasized: true, mono: true, categories: 'Stellar activity, Wallet history' },
  { key: 'wallet-second', icon: 'stellar', name: 'Stellar wallet', handle: 'GC3P…Q9LM · since 2023', connected: true, emphasized: true, mono: true, categories: 'Wallet history' },
  { key: 'github', icon: 'github', name: 'GitHub', handle: 'novabuilder', connected: true, emphasized: false, mono: false, categories: 'Developer' },
  { key: 'x', icon: 'xlogo', name: 'X', handle: '@novabuilds', connected: true, emphasized: false, mono: false, categories: 'Social' },
  { key: 'discord', icon: 'discord', name: 'Discord', handle: 'nova#2041', connected: true, emphasized: false, mono: false, categories: 'Social, Ecosystem' },
  { key: 'telegram', icon: 'telegram', name: 'Telegram', handle: '@nova_xlm', connected: true, emphasized: false, mono: false, categories: 'Social' },
  { key: 'farcaster', icon: 'farcaster', name: 'Farcaster', handle: 'Not connected', connected: false, emphasized: false, mono: false, categories: 'Social' },
]
