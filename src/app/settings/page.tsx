'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGate } from '@/components/AuthGate'
import { Icon } from '@/components/Icon'
import { PageFrame } from '@/components/PageFrame'
import {
  loadConnections,
  randomScore,
  saveConnections,
  shortAddress,
  type ConnectionKey,
  type Connections,
} from '@/lib/connections'
import { useLaunchpad } from '@/lib/launchpad'

export default function SettingsPage() {
  const router = useRouter()
  const { isSignedIn, address, logout } = useLaunchpad()
  const [connections, setConnections] = useState<Connections>(() => loadConnections(address))
  const [connecting, setConnecting] = useState<ConnectionKey | null>(null)
  const [publicProfile, setPublicProfile] = useState(true)
  const [showHandles, setShowHandles] = useState(false)
  const [launchEmails, setLaunchEmails] = useState(true)

  if (!isSignedIn) {
    return (
      <PageFrame>
        <AuthGate />
      </PageFrame>
    )
  }

  function updateConnection(provider: ConnectionKey) {
    if (connections[provider].connected) {
      const next = { ...connections, [provider]: { connected: false } }
      setConnections(next)
      saveConnections(address, next)
      return
    }
    setConnecting(provider)
    window.setTimeout(() => {
      const next = {
        ...connections,
        [provider]: {
          connected: true,
          handle: provider === 'x' ? '@stellar_builder' : 'stellar-builder',
          score: randomScore(),
          source: 'prototype' as const,
        },
      }
      setConnections(next)
      saveConnections(address, next)
      setConnecting(null)
    }, 850)
  }

  return (
    <PageFrame className="settings-page">
      <section className="settings-heading">
        <div>
          <h1>Connections & privacy</h1>
          <p>Manage how you sign in, which identities are linked, and what appears on your public reputation profile.</p>
        </div>
      </section>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <a href="#account" className="active">Account</a>
          <a href="#connections">Connections</a>
          <a href="#privacy">Privacy</a>
          <a href="#notifications">Notifications</a>
        </nav>
        <div className="settings-content">
          <SettingsSection id="account" title="Stellar account" description="Blux manages your primary authentication and wallet session.">
            <div className="settings-account">
              <span className="identity-mark"><Icon name="wallet" /></span>
              <div><strong>{shortAddress(address)}</strong><span>Connected through Blux · Stellar Testnet</span></div>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-[5px] bg-transparent p-0 text-cobalt underline decoration-1 underline-offset-4"
                onClick={() => router.push('/portfolio')}
              >
                View panel
              </button>
            </div>
          </SettingsSection>

          <SettingsSection id="connections" title="Connected identities" description="Optional accounts add independent signals to your reputation profile.">
            {(['x', 'github', 'gitlab'] as ConnectionKey[]).map((provider) => (
              <div className="settings-connection" key={provider}>
                <span className="connection-icon"><Icon name={provider === 'x' ? 'x' : provider} /></span>
                <div>
                  <strong>{provider === 'x' ? 'X' : provider === 'github' ? 'GitHub' : 'GitLab'}</strong>
                  <span>{connections[provider].connected ? `${connections[provider].handle} · Signal ${connections[provider].score}` : 'Not connected'}</span>
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={connecting === provider}
                  onClick={() => updateConnection(provider)}
                >
                  {connecting === provider ? 'Connecting…' : connections[provider].connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
            <p className="mt-3.5 text-[10px] text-muted">
              OAuth linking is represented as a frontend prototype until the backend is connected.
            </p>
          </SettingsSection>

          <SettingsSection id="privacy" title="Privacy" description="Choose what applications and public visitors can see.">
            <ToggleRow label="Public reputation profile" description="Let people find the signals you choose to publish." value={publicProfile} onChange={setPublicProfile} />
            <ToggleRow label="Expose connected handles" description="Show public usernames next to verified credentials." value={showHandles} onChange={setShowHandles} />
          </SettingsSection>

          <SettingsSection id="notifications" title="Notifications" description="Decide which launch events should reach you.">
            <ToggleRow label="Launch and claim reminders" description="Get reminders before commitments close or tokens unlock." value={launchEmails} onChange={setLaunchEmails} />
          </SettingsSection>

          <section className="danger-row">
            <div>
              <h2>Session</h2>
              <p>Sign out of this browser. Your saved profile connections remain attached to this prototype account.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={logout}>
              <Icon name="logout" size={17} /> Log out
            </button>
          </section>
        </div>
      </div>
    </PageFrame>
  )
}

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="settings-section" id={id}>
      <div className="section-copy"><h2>{title}</h2><p>{description}</p></div>
      <div>{children}</div>
    </section>
  )
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div><strong>{label}</strong><span>{description}</span></div>
      <button
        type="button"
        className={`toggle ${value ? 'on' : ''}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  )
}
