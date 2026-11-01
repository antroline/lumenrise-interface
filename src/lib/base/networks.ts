import type { BaseNetwork } from '../networks/types';

// Trading is conditional on live verification; Mainnet supports graduated v4 pools.
export const BASE_NETWORKS: readonly BaseNetwork[] = [
  {
    id: 'base-mainnet', blockchain: 'base', label: 'Base Mainnet',
    environment: 'mainnet', apiNetwork: 'public', chainId: 8453, nativeCurrency: 'ETH',
    capabilities: { wallet: true, projects: true, trading: true, creation: false },
  },
  {
    id: 'base-sepolia', blockchain: 'base', label: 'Base Sepolia',
    environment: 'testnet', apiNetwork: 'testnet', chainId: 84532, nativeCurrency: 'ETH',
    capabilities: { wallet: true, projects: true, trading: true, creation: true },
  },
];
