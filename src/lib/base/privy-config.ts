import type { PrivyClientConfig } from '@privy-io/react-auth';
import { base, baseSepolia } from 'viem/chains';
import type { BaseNetwork } from '../networks/types';

/** Public SDK configuration only. Credentials are injected at the server boundary. */
export function createPrivyConfig(
  network: BaseNetwork,
  dark: boolean,
): PrivyClientConfig {
  const chain = network.chainId === base.id ? base : baseSepolia;
  return {
    defaultChain: chain,
    supportedChains: [chain],
    loginMethods: ['wallet'],
    embeddedWallets: { ethereum: { createOnLogin: 'off' } },
    appearance: {
      theme: dark ? 'dark' : 'light',
      accentColor: '#cbff18',
      logo: dark
        ? '/branding/lumenrise-logo-horizontal-for-dark-background.svg'
        : '/branding/lumenrise-logo-horizontal-for-light-background.svg',
      walletChainType: 'ethereum-only',
    },
  };
}
