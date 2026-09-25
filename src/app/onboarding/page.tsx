'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { Icon, type IconName } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { PageFrame } from '@/components/PageFrame';
import {
  loadConnections,
  randomScore,
  saveConnections,
  shortAddress,
  type Connection,
  type ConnectionKey,
  type Connections,
} from '@/lib/connections';
import { useLaunchpad } from '@/lib/launchpad';

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn, address } = useLaunchpad();
  const [connections, setConnections] = useState<Connections>(() =>
    loadConnections(address),
  );
  const [connecting, setConnecting] = useState<ConnectionKey | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isSignedIn) {
    return (
      <PageFrame>
        <AuthGate />
      </PageFrame>
    );
  }

  function connect(provider: ConnectionKey) {
    setConnecting(provider);
    window.setTimeout(() => {
      const handle = provider === 'x' ? '@stellar_builder' : 'stellar-builder';
      const next = {
        ...connections,
        [provider]: {
          connected: true,
          handle,
          score: randomScore(),
          source: 'prototype' as const,
        },
      };
      setConnections(next);
      saveConnections(address, next);
      setConnecting(null);
    }, 850);
  }

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function finish() {
    window.localStorage.setItem(`launchpad:onboarded:${address}`, 'true');
    const destination =
      window.sessionStorage.getItem('launchpad:returnTo') || '/portfolio';
    window.sessionStorage.removeItem('launchpad:returnTo');
    router.push(destination);
  }

  const completed = Object.values(connections).filter(
    (item) => item.connected,
  ).length;

  return (
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <Logo />
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] bg-transparent p-0 text-cobalt underline decoration-1 underline-offset-4"
          type="button"
          onClick={finish}
        >
          Skip for now
        </button>
      </header>
      <main className="onboarding-layout">
        <aside className="onboarding-aside">
          <h2>Your wallet is ready.</h2>
          <p>
            Optional setup: add the identities that make your activity easier to
            verify. You control what appears publicly.
          </p>
          <div
            className="setup-meter"
            role="progressbar"
            aria-label="Optional identity connections"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={completed}
            aria-valuetext={`${completed} of 3 optional connections complete`}
          >
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={index < completed ? 'done' : undefined}
              />
            ))}
          </div>
          <p className="aside-note">
            <Icon name="shield" size={17} /> You can disconnect any account
            later in Settings.
          </p>
        </aside>

        <section className="identity-setup">
          <div className="setup-heading">
            <div>
              <h1>Make your activity count.</h1>
              <p>
                Connections are optional. Each one adds a separate, explainable
                signal—never a hidden overall rating.
              </p>
            </div>
            <div className="wallet-summary">
              <span>Stellar account</span>
              <strong>{shortAddress(address)}</strong>
              <button
                type="button"
                aria-label="Copy Stellar address"
                onClick={() => void copyAddress()}
              >
                <Icon name={copied ? 'check' : 'copy'} size={16} />{' '}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="connection-list">
            <ConnectionRow
              provider="x"
              title="Connect X"
              description="Use your X account as the public identity on your profile."
              signal="Social reputation"
              connection={connections.x}
              isConnecting={connecting === 'x'}
              onConnect={() => connect('x')}
            />
            <ConnectionRow
              provider="github"
              title="Connect GitHub"
              description="Verify contribution history and developer activity."
              signal="Developer reputation"
              connection={connections.github}
              isConnecting={connecting === 'github'}
              onConnect={() => connect('github')}
            />
            <ConnectionRow
              provider="gitlab"
              title="Connect GitLab"
              description="Add project history from your GitLab account."
              signal="Developer reputation"
              connection={connections.gitlab}
              isConnecting={connecting === 'gitlab'}
              onConnect={() => connect('gitlab')}
            />
          </div>

          <div className="prototype-note">
            <Icon name="spark" size={18} />
            <p>
              <strong>Prototype connection flow.</strong> The buttons generate
              an illustrative signal locally. Production OAuth linking will be
              completed by the backend.
            </p>
          </div>

          <div className="setup-actions">
            <p>
              {completed === 0
                ? 'Nothing else is required.'
                : `${completed} optional ${completed === 1 ? 'identity' : 'identities'} connected.`}
            </p>
            <button
              className="button button-primary button-large"
              type="button"
              onClick={finish}
            >
              Continue to your panel <Icon name="arrow" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ConnectionRow({
  provider,
  title,
  description,
  signal,
  connection,
  isConnecting,
  onConnect,
}: {
  provider: ConnectionKey;
  title: string;
  description: string;
  signal: string;
  connection: Connection;
  isConnecting: boolean;
  onConnect: () => void;
}) {
  const iconName: IconName = provider === 'x' ? 'x' : provider;
  return (
    <article
      className={`connection-row ${connection.connected ? 'connected' : ''}`}
    >
      <div className="connection-icon">
        <Icon name={iconName} size={22} />
      </div>
      <div className="connection-copy">
        <div>
          <h3>{title}</h3>
          <span>{signal}</span>
        </div>
        <p>{description}</p>
        {connection.connected && (
          <small>
            {connection.handle} ·{' '}
            {connection.source === 'blux'
              ? 'Connected through Blux'
              : 'Prototype connection'}
          </small>
        )}
      </div>
      {connection.connected ? (
        <div className="connection-result">
          <span>Signal</span>
          <strong>{connection.score}</strong>
          <span className="col-span-full mt-2 flex items-center gap-1 text-[10px] text-mint-ink">
            <Icon name="check" size={14} /> Connected
          </span>
        </div>
      ) : (
        <button
          className="button button-secondary"
          type="button"
          disabled={isConnecting}
          onClick={onConnect}
        >
          {isConnecting ? 'Connecting…' : 'Connect'}
        </button>
      )}
    </article>
  );
}
