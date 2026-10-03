export type LaunchLinkKind = 'website' | 'docs' | 'x' | 'discord' | 'telegram'

export type LaunchLink = { kind: LaunchLinkKind; href: string }

export type LaunchContent = {
  overview?: string
  /** Project-provided destinations. Preview entries use the reserved `.example` domain. */
  links?: LaunchLink[]
  facts?: { label: string; value: string }[]
  team?: { name: string; role: string; source: 'verified' | 'project-provided'; image?: string }[]
  evidence?: { label: string; detail: string; source: 'verified' | 'project-provided' }[]
  tokenomics?: {
    totalSupply: string
    forSale: string
    allocations: { name: string; share: string; tokens: string; unlock: string }[]
  }
  updates?: { title: string; detail: string }[]
  unlockSummary?: string
}

const contentBySlug: Record<string, LaunchContent> = {
  northstar: {
    overview: 'Northstar gives communities a shared place to run proposals, pay contributors and track commitments on Stellar. Groups create a space, set membership rules with Soroban contracts and pay out in any Stellar asset. NSTR is used for governance of the protocol treasury and to stake for hosted spaces.',
    links: [
      { kind: 'website', href: 'https://northstar.example' },
      { kind: 'docs', href: 'https://northstar.example/docs' },
      { kind: 'x', href: 'https://northstar.example/x' },
      { kind: 'discord', href: 'https://northstar.example/discord' },
      { kind: 'telegram', href: 'https://northstar.example/telegram' },
    ],
    facts: [
      { label: 'Live product', value: 'Yes' },
      { label: 'Founded', value: '2024' },
    ],
    team: [
      { name: 'Amara Kole', role: 'Co-founder, product', source: 'verified' },
      { name: 'Jonas Reyes', role: 'Co-founder, engineering', source: 'verified' },
      { name: 'Mei Lin', role: 'Soroban contracts', source: 'verified' },
      { name: 'Daniel Stone', role: 'Community', source: 'project-provided' },
    ],
    evidence: [
      { label: 'GitHub activity', detail: 'Public repositories and contributor activity', source: 'verified' },
      { label: 'Soroban contracts', detail: 'Sale, vesting and verification contracts', source: 'verified' },
      { label: 'Security audit', detail: 'Review of sale and vesting contracts', source: 'verified' },
      { label: 'Token supply', detail: 'Issuer account locked', source: 'verified' },
      { label: 'Domain & stellar.toml', detail: 'Issuer and contacts declared', source: 'verified' },
      { label: 'Treasury multisig', detail: 'Signer identities provided by the project', source: 'project-provided' },
    ],
    tokenomics: {
      totalSupply: '100,000,000 NSTR',
      forSale: '20%',
      allocations: [
        { name: 'Community sale', share: '20%', tokens: '20,000,000', unlock: '25% at TGE, 6 mo linear' },
        { name: 'Ecosystem & grants', share: '25%', tokens: '25,000,000', unlock: '48 mo linear' },
        { name: 'Treasury', share: '22%', tokens: '22,000,000', unlock: 'Governance controlled' },
        { name: 'Team', share: '18%', tokens: '18,000,000', unlock: '12 mo cliff, 36 mo linear' },
        { name: 'Liquidity', share: '10%', tokens: '10,000,000', unlock: 'Unlocked at TGE' },
        { name: 'Advisors', share: '5%', tokens: '5,000,000', unlock: '6 mo cliff, 24 mo linear' },
      ],
    },
    updates: [
      { title: 'Settlement timeline confirmed', detail: 'Final allocations will be published before claims open.' },
      { title: 'Audit report published', detail: 'The sale and vesting contracts have been reviewed.' },
    ],
    unlockSummary: '25% at TGE, then the remainder over 6 months',
  },
}

export function getLaunchContent(slug: string): LaunchContent {
  return contentBySlug[slug] ?? {}
}
