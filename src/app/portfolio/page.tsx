'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthGate } from '@/components/AuthGate'
import { Icon } from '@/components/Icon'
import { PageFrame } from '@/components/PageFrame'
import { loadConnections, shortAddress } from '@/lib/connections'
import { useLaunchpad } from '@/lib/launchpad'

export default function PortfolioPage() {
  const { isSignedIn, address } = useLaunchpad()

  if (!isSignedIn) {
    return (
      <PageFrame>
        <AuthGate />
      </PageFrame>
    )
  }

  const connections = loadConnections(address)
  const scores = Object.values(connections).flatMap((item) => item.score ? [item.score] : [])
  const reputation = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 38

  return (
    <PageFrame className="dashboard-page">
      <section className="dashboard-heading">
        <div>
          <h1>Your launch activity</h1>
          <p>Commitments, allocations, claims, and identity signals for {shortAddress(address)}.</p>
        </div>
        <Link href="/settings" className="button button-secondary">
          <Icon name="settings" size={17} /> Manage account
        </Link>
      </section>

      <section className="account-strip" aria-label="Account overview">
        <div className="account-identity">
          <span className="identity-mark"><Icon name="wallet" /></span>
          <div><span>Active Stellar account</span><strong>{shortAddress(address)}</strong></div>
        </div>
        <div><span>Reputation signal</span><strong>{reputation}<small>/100</small></strong></div>
        <div><span>Connected identities</span><strong>{Object.values(connections).filter((item) => item.connected).length}<small>/3</small></strong></div>
        <div><span>Claimable now</span><strong>420<small> MDR</small></strong></div>
      </section>

      <section className="dashboard-columns">
        <div className="activity-panel">
          <div className="panel-heading">
            <div><h2>Active positions</h2><p>Illustrative data</p></div>
            <Link href="/">Explore launches <Icon name="arrow" size={15} /></Link>
          </div>
          <PortfolioRow token="MDR" project="Meridian" status="Committed" primary="$1,200 USDC" secondary="Estimated 1,840 MDR" action="Manage" />
          <PortfolioRow token="LUMA" project="Luma Commons" status="Auction bid" primary="$640 USDC" secondary="Bid: $0.42 / LUMA" action="View bid" />
          <PortfolioRow token="KPL" project="Kepler Studio" status="Claimable" primary="420 KPL" secondary="Next unlock Oct 14" action="Claim" highlighted />
        </div>
        <aside className="profile-panel">
          <div className="panel-heading">
            <div><h2>Reputation</h2><p>Explainable signals</p></div>
            <Link href="/reputation">View profile</Link>
          </div>
          <SignalRow label="Stellar activity" value={71} />
          <SignalRow label="Developer reputation" value={connections.github.score || connections.gitlab.score || 32} />
          <SignalRow label="Social reputation" value={connections.x.score || 24} />
          <SignalRow label="Sybil confidence" value={84} />
          <Link href="/onboarding" className="profile-cta">
            <Icon name="spark" size={17} /> Add another signal <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </section>
    </PageFrame>
  )
}

function PortfolioRow({ token, project, status, primary, secondary, action, highlighted = false }: {
  token: string
  project: string
  status: string
  primary: string
  secondary: string
  action: string
  highlighted?: boolean
}) {
  const router = useRouter()

  return (
    <article className="portfolio-row">
      <span className="portfolio-token">{token.slice(0, 1)}</span>
      <div><strong>{project}</strong><span>{token} · {status}</span></div>
      <div><strong>{primary}</strong><span>{secondary}</span></div>
      <button
        type="button"
        className={highlighted ? 'button button-primary' : 'button button-secondary'}
        onClick={() => router.push(`/launch/${project.toLowerCase().replace(/\s/g, '-')}`)}
      >
        {action}
      </button>
    </article>
  )
}

function SignalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="signal-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <div className="signal-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  )
}
