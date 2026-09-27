export type MissionIcon = 'code' | 'git' | 'wallet' | 'vote' | 'fingerprint' | 'farcaster'

export type MissionStatus = 'start' | 'progress' | 'done'

export type Mission = {
  key: string
  icon: MissionIcon
  category: string
  title: string
  description: string
  reward: string
  rewardLabel: string
  verifiedBy: string
  time: string
  status: MissionStatus
  progress?: string
}

export const missions: Mission[] = [
  {
    key: 'deploy-contract',
    icon: 'code',
    category: 'Developer',
    title: 'Deploy a Soroban contract',
    description: 'Deploy any contract to testnet or mainnet from a wallet you have linked.',
    reward: '+14',
    rewardLabel: 'Developer',
    verifiedBy: 'On-chain check',
    time: '20 min',
    status: 'start',
  },
  {
    key: 'merge-pr',
    icon: 'git',
    category: 'Developer',
    title: 'Merge a PR to an ecosystem repo',
    description: 'Get a pull request merged in any repository on the Stellar ecosystem list.',
    reward: '+18',
    rewardLabel: 'Developer',
    verifiedBy: 'GitHub',
    time: 'Varies',
    status: 'start',
  },
  {
    key: 'link-older-wallet',
    icon: 'wallet',
    category: 'Wallet history',
    title: 'Link an older Stellar wallet',
    description: 'Sign a message from a wallet older than your current primary wallet.',
    reward: '+6',
    rewardLabel: 'Wallet',
    verifiedBy: 'Wallet signature',
    time: '2 min',
    status: 'start',
  },
  {
    key: 'vote-governance',
    icon: 'vote',
    category: 'Ecosystem',
    title: 'Vote in a governance round',
    description: 'Cast votes in two Stellar Community Fund or protocol governance rounds.',
    reward: '+5',
    rewardLabel: 'Ecosystem',
    verifiedBy: 'On-chain check',
    time: '10 min',
    status: 'progress',
    progress: '1 of 2',
  },
  {
    key: 'verify-credential',
    icon: 'fingerprint',
    category: 'Sybil resistance',
    title: 'Verify a unique credential',
    description: 'Add a proof-of-personhood credential. Only the proof is stored, not your data.',
    reward: '−4 risk',
    rewardLabel: 'Sybil',
    verifiedBy: 'Credential issuer',
    time: '5 min',
    status: 'start',
  },
  {
    key: 'connect-farcaster',
    icon: 'farcaster',
    category: 'Social',
    title: 'Connect Farcaster',
    description: 'Link your Farcaster account to add another independent social signal.',
    reward: '+4',
    rewardLabel: 'Social',
    verifiedBy: 'OAuth',
    time: '1 min',
    status: 'done',
  },
]

export const missionCategories = [
  'All',
  'Stellar activity',
  'Developer',
  'Social',
  'Ecosystem',
  'Wallet history',
  'Sybil resistance',
] as const

export const missionStats = {
  completed: 12,
  inProgress: 3,
  credentials: 4,
  total: 24,
}

export const focus = {
  category: 'Developer',
  title: 'Developer is your lowest signal',
  description: 'Reaching 50 meets the requirement for the Aster launch and moves you most of the way to Level 5.',
  current: 32,
  target: 50,
  steps: [
    { icon: 'code' as MissionIcon, title: 'Deploy a Soroban contract', award: '+14 Developer' },
    { icon: 'git' as MissionIcon, title: 'Merge a PR to an ecosystem repo', award: '+18 Developer' },
    { icon: 'github' as MissionIcon, title: 'Add a second active repository', award: '+6 Developer' },
  ],
}

export type Campaign = {
  key: string
  project: 'Northstar' | 'Tidewell' | 'Lattice'
  title: string
  description: string
  credential: string
  dates: string
  joined: string
  done: number
  total: number
}

export const campaigns: Campaign[] = [
  {
    key: 'northstar-builders',
    project: 'Northstar',
    title: 'Community builders',
    description: 'Run a space, invite 3 members and fund one proposal.',
    credential: 'Northstar builder',
    dates: 'Sep 20 – Oct 20',
    joined: '1,208',
    done: 2,
    total: 3,
  },
  {
    key: 'tidewell-testers',
    project: 'Tidewell',
    title: 'Anchor testers',
    description: 'Send a test remittance through two anchors and report the result.',
    credential: 'Tidewell tester',
    dates: 'Sep 25 – Oct 06',
    joined: '412',
    done: 0,
    total: 4,
  },
  {
    key: 'lattice-indexer',
    project: 'Lattice',
    title: 'Indexer early access',
    description: 'Index a contract of your choice and publish a query.',
    credential: 'Lattice indexer',
    dates: 'Oct 01 – Oct 31',
    joined: '—',
    done: 0,
    total: 2,
  },
]
