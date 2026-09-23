'use client'

import Link from 'next/link'
import { useLaunchpad } from '@/lib/launchpad'
import { Icon, type IconName } from './Icon'
import { PageFrame } from './PageFrame'

type ComingSoonContent = {
  title: string
  description: string
  icon: IconName
}

const comingSoonContent: Record<string, ComingSoonContent> = {
  '/reputation': { title: 'Reputation profile', description: 'A transparent view of Stellar activity, developer history, social reputation, ecosystem participation, wallet age, and Sybil confidence.', icon: 'shield' },
  '/missions': { title: 'Missions', description: 'Practical ways to improve a specific reputation signal through verified ecosystem participation.', icon: 'spark' },
  '/create': { title: 'Create a launch', description: 'Configure allocation mechanics, eligibility policies, accepted assets, vesting, claims, and Soroban deployment.', icon: 'wallet' },
  '/campaigns': { title: 'Growth campaigns', description: 'Build quests, referrals, allowlists, and partner campaigns around genuine participation.', icon: 'spark' },
  '/explorer': { title: 'Reputation explorer', description: 'Inspect public signals for a Stellar address and test how an eligibility policy treats it.', icon: 'search' },
  '/developers': { title: 'Developer platform', description: 'API keys, SDK examples, policy tooling, webhooks, and eligibility queries for other Stellar applications.', icon: 'github' },
  '/cli': { title: 'CLI & agents', description: 'Create, configure, and deploy reproducible Stellar launches from a terminal or coding agent.', icon: 'external' },
  launch: { title: 'Permanent project page', description: 'Project details, tokenomics, team, contracts, audits, allocation rules, vesting, updates, and post-launch liquidity will live here.', icon: 'external' },
  auction: { title: 'Auction room', description: 'Bids, clearing range, supply, settlement rules, and claim status will be presented in a focused auction experience.', icon: 'wallet' },
}

const fallbackContent: ComingSoonContent = {
  title: 'This route is taking shape',
  description: 'The foundation is in place and this product surface is next in the build sequence.',
  icon: 'spark',
}

export function ComingSoon({ pathKey }: { pathKey?: string }) {
  const { isSignedIn, login } = useLaunchpad()
  const content = (pathKey && comingSoonContent[pathKey]) || fallbackContent

  return (
    <PageFrame className="coming-soon">
      <div className="mb-[26px] grid size-[54px] place-items-center rounded-full bg-cobalt-wash text-cobalt">
        <Icon name={content.icon} size={28} />
      </div>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <div className="coming-actions">
        <Link href="/" className="button button-primary">
          Explore launches <Icon name="arrow" />
        </Link>
        {!isSignedIn && (
          <button type="button" className="button button-secondary" onClick={() => void login('/portfolio')}>
            Log in with Blux
          </button>
        )}
      </div>
      <div className="coming-index">
        <span>Discover</span>
        <span>Build reputation</span>
        <span>Participate</span>
        <span>Claim</span>
        <span>Track</span>
      </div>
    </PageFrame>
  )
}
