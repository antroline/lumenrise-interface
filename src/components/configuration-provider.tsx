'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { configureApi, configureApiContext } from '@/lib/api/client';
import {
  loadConfiguration,
  retryConfiguration,
} from '@/lib/api/config';
import { configureNetwork } from '@/lib/stellar/network';
import { initializeStellarClients } from '@/lib/stellar/clients';
import { Button } from '@/components/ui/button';
import { AppLoading } from './app-loading';

import { ConfigurationContext } from '@/lib/configuration';
import { NetworkProvider } from './network-provider';
import { initialNetworkSelection, isProjectRoute, LEGACY_NETWORK_STORAGE_KEY, NETWORK_STORAGE_KEY, networkSwitchHref, parseNetworkId, resolveNetwork } from '@/lib/networks/registry';
import type { AppNetwork, NetworkId } from '@/lib/networks/types';

const MIN_LOADING_MS = 500;

export function ConfigurationProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const requested = params.get('network');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    config?: import('@/lib/api/config').ApplicationConfiguration;
    network?: AppNetwork;
    error?: string;
  }>({});
  useEffect(() => {
    let active = true;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    configureApi(apiBaseUrl);
    const initialize = async () => {
      const selection = initialNetworkSelection(
        new URLSearchParams(window.location.search).get('network'),
        sessionStorage.getItem(NETWORK_STORAGE_KEY) ?? sessionStorage.getItem(LEGACY_NETWORK_STORAGE_KEY),
        window.location.pathname,
      );
      const id = parseNetworkId(selection);
      const base = id?.startsWith('base-');
      if (base) configureApiContext({ chain: 'base', network: id === 'base-mainnet' ? 'public' : 'testnet' });
      const config = await (attempt ? retryConfiguration() : loadConfiguration());
      return { config, network: resolveNetwork(selection, 'chain' in config ? undefined : config) };
    };
    initialize()
      .then(async ({ config, network }) => {
        if (!active) return;
        if (!config.network.supported.includes(network.apiNetwork)) throw new Error('The selected network is not supported by the server.');
        if (network.blockchain === 'stellar') {
          if ('chain' in config) throw new Error('Stellar configuration is not ready.');
          configureNetwork(config, network.apiNetwork);
          await initializeStellarClients();
          if (!active) return;
          configureApiContext({ chain: 'stellar', network: network.apiNetwork }, config.network.supported);
          sessionStorage.setItem(LEGACY_NETWORK_STORAGE_KEY, network.apiNetwork);
        }
        if (!active) return;
        sessionStorage.setItem(NETWORK_STORAGE_KEY, network.id);
        const reveal = () => {
          if (active) setState({ config, network });
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
  let requestedNetworkId: NetworkId | undefined;
  if (state.network && requested) {
    try {
      const requestedId = parseNetworkId(requested);
      if (isProjectRoute(pathname) && requestedId && requestedId !== state.network.id) {
        requestedNetworkId = requestedId;
      } else {
        networkChanged = (state.network.blockchain === 'base' && (requestedId === null || requestedId.startsWith('stellar-'))) ||
          resolveNetwork(requested, state.config && !('chain' in state.config) ? state.config : undefined).id !== state.network.id;
      }
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
        <Button variant="secondary" onClick={() => window.location.assign(networkSwitchHref('base-mainnet'))}>
          View Base
        </Button>
      </main>
    );
  if (!state.network || networkChanged) return <AppLoading />;
  return <NetworkProvider network={state.network} config={state.config && !('chain' in state.config) ? state.config : undefined} requestedNetworkId={requestedNetworkId}>
    {state.config
      ? <ConfigurationContext.Provider value={state.config}>{children}</ConfigurationContext.Provider>
      : children}
  </NetworkProvider>;
}
