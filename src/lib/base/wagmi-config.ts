import { createConfig } from '@privy-io/wagmi';
import { base, baseSepolia } from 'viem/chains';
import { http } from 'wagmi';
import type { BaseNetwork } from '../networks/types';

export function createBaseWagmiConfig(network: BaseNetwork) {
  if (network.chainId === base.id) {
    return createConfig({
      chains: [base],
      transports: { [base.id]: http() },
    });
  }
  return createConfig({
    chains: [baseSepolia],
    transports: { [baseSepolia.id]: http() },
  });
}
