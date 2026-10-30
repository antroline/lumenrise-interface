import type { BaseNetwork } from '../networks/types';

// Sepolia trading is conditional on live deployment, wallet, and token verification.
export const BASE_NETWORKS: readonly BaseNetwork[] = [
  {
    id: 'base-mainnet', blockchain: 'base', label: 'Base Mainnet',
    environment: 'mainnet', apiNetwork: 'public', chainId: 8453, nativeCurrency: 'ETH',
    capabilities: { wallet: true, projects: true, trading: false, creation: false },
  },
  {
    id: 'base-sepolia', blockchain: 'base', label: 'Base Sepolia',
    environment: 'testnet', apiNetwork: 'testnet', chainId: 84532, nativeCurrency: 'ETH',
    capabilities: { wallet: true, projects: true, trading: true, creation: true },
  },
];
