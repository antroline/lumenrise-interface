import type { PublicConfiguration } from '../api/config';
import type { StellarNetwork } from '../networks/types';

export function stellarNetworks(config: PublicConfiguration): StellarNetwork[] {
  return config.network.supported.map(apiNetwork => ({
    id: apiNetwork === 'public' ? 'stellar-mainnet' : 'stellar-testnet',
    blockchain: 'stellar',
    label: apiNetwork === 'public' ? 'Stellar Mainnet' : 'Stellar Testnet',
    environment: apiNetwork === 'public' ? 'mainnet' : 'testnet',
    nativeCurrency: 'XLM',
    apiNetwork,
    capabilities: {
      wallet: true, projects: true, trading: true,
      creation: config.network.configurations[apiNetwork].launchConfigured,
    },
  }));
}
