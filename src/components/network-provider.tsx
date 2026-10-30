'use client';

import type { ReactNode } from 'react';
import { availableNetworks, networkSwitchHref } from '@/lib/networks/registry';
import type { AppNetwork, Blockchain, NetworkId } from '@/lib/networks/types';
import type { PublicConfiguration } from '@/lib/api/config';
import { NetworkContext } from '@/lib/networks/context';

export function NetworkProvider({ network, config, requestedNetworkId, children }: {
  network: AppNetwork;
  requestedNetworkId?: NetworkId;
  config?: PublicConfiguration;
  children: ReactNode;
}) {
  const networks = availableNetworks(config);
  const switchNetwork = (id: NetworkId) => {
    if (id === network.id || !networks.some(entry => entry.id === id)) return;
    // Stellar clients and in-flight signing configuration are immutable per document.
    // Persist only after destination initialization succeeds, so a failed switch is recoverable.
    window.location.assign(networkSwitchHref(id));
  };
  const switchBlockchain = (blockchain: Blockchain) => {
    if (blockchain === network.blockchain) return;
    window.location.assign(networkSwitchHref(blockchain === 'base' ? 'base-mainnet' : 'stellar'));
  };

  return (
    <NetworkContext.Provider value={{ activeNetwork: network, requestedNetworkId, networks, switchNetwork, switchBlockchain }}>
      {children}
    </NetworkContext.Provider>
  );
}
