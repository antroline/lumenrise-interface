'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { configureApi, configureApiNetwork } from '@/lib/api/client';
import {
  loadConfiguration,
  retryConfiguration,
  selectNetwork,
  type PublicConfiguration,
} from '@/lib/api/config';
import { API_NETWORK, configureNetwork } from '@/lib/stellar/network';
import { initializeStellarClients } from '@/lib/stellar/clients';
import { Button } from '@/components/ui/button';
import { AppLoading } from './app-loading';

import { ConfigurationContext } from '@/lib/configuration';

const MIN_LOADING_MS = 500;

export function ConfigurationProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const requested = params.get('network');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    config?: PublicConfiguration;
    error?: string;
  }>({});
  useEffect(() => {
    let active = true;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    configureApi(apiBaseUrl);
    (attempt ? retryConfiguration() : loadConfiguration())
      .then(async (config) => {
        if (!active) return;
        const selected = selectNetwork(
          config,
          new URLSearchParams(window.location.search).get('network') ??
            sessionStorage.getItem('lumenrise:network'),
        );
        configureNetwork(config, selected);
        await initializeStellarClients();
        if (!active) return;
        configureApiNetwork(selected, config.network.supported);
        sessionStorage.setItem('lumenrise:network', selected);
        const reveal = () => {
          if (active) setState({ config });
        };
        const remaining = Math.max(
          0,
          MIN_LOADING_MS - (Date.now() - startedAt),
        );
        if (remaining) revealTimer = setTimeout(reveal, remaining);
        else reveal();
      })
      .catch((error) => {
        if (active)
          setState({
            error:
              error instanceof Error
                ? error.message
                : 'Could not load server configuration.',
          });
      });
    return () => {
      active = false;
      clearTimeout(revealTimer);
    };
    // A document has one immutable network. Route changes are handled below.
  }, [apiBaseUrl, attempt]);

  let networkChanged = false;
  let selectionError: string | undefined;
  if (state.config && requested) {
    try {
      networkChanged = selectNetwork(state.config, requested) !== API_NETWORK;
    } catch (error) {
      selectionError =
        error instanceof Error ? error.message : 'Unsupported network.';
    }
  }
  useEffect(() => {
    if (networkChanged) window.location.reload();
  }, [networkChanged]);

  const error = state.error ?? selectionError;
  if (error)
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <p role="alert">{error}</p>
        <Button
          onClick={() => {
            setState({});
            setAttempt((value) => value + 1);
          }}
        >
          Retry
        </Button>
      </main>
    );
  if (!state.config || networkChanged) return <AppLoading />;
  return (
    <ConfigurationContext.Provider value={state.config}>
      {children}
    </ConfigurationContext.Provider>
  );
}
