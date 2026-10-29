'use client';

import { createContext, useContext } from 'react';
import type { AppNetwork, Blockchain, NetworkId } from './types';

export type NetworkContextValue = {
  activeNetwork: AppNetwork;
  requestedNetworkId?: NetworkId;
  networks: readonly AppNetwork[];
  switchNetwork: (id: NetworkId) => void;
  switchBlockchain: (blockchain: Blockchain) => void;
};

export const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork() {
  const value = useContext(NetworkContext);
  if (!value) throw new Error('NetworkProvider is required.');
  return value;
}
