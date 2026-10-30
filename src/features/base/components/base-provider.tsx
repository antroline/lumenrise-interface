'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { PrivyProvider, useActiveWallet } from '@privy-io/react-auth';
import { WagmiProvider, type SetActiveWalletForWagmiType } from '@privy-io/wagmi';
import { WagmiProvider as PublicWagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDarkTheme } from '@/hooks/use-dark-theme';
import { createPrivyConfig } from '@/lib/base/privy-config';
import { createBaseWagmiConfig } from '@/lib/base/wagmi-config';
import type { BaseNetwork } from '@/lib/networks/types';
import { useNetwork } from '@/lib/networks/context';
import { ToastProvider } from '@/components/ui/toast';
import { useConfiguration } from '@/lib/configuration';
import { BaseAccountProvider, BasePublicAccountProvider } from './base-account-provider';
import { linkedEvmAddresses, selectLinkedWallet } from '@/lib/base/wallet';

export default function BaseProvider({ children }: { children: ReactNode }) {
  const { auth: { appId } } = useConfiguration();
  const { activeNetwork } = useNetwork();
  const dark = useDarkTheme();
  if (activeNetwork.blockchain !== 'base') throw new Error('BaseProvider requires a Base network.');
  if (!appId.trim()) {
    return <PublicBaseProvider>{children}</PublicBaseProvider>;
  }
  return <PrivyProvider appId={appId} config={createPrivyConfig(activeNetwork, dark)}>
    <BaseWeb3Provider network={activeNetwork}>
      <ToastProvider><BaseAccountProvider>{children}</BaseAccountProvider></ToastProvider>
    </BaseWeb3Provider>
  </PrivyProvider>;
}

function PublicBaseProvider({ children }: { children: ReactNode }) {
  const { activeNetwork } = useNetwork();
  const [config] = useState(() => {
    if (activeNetwork.blockchain !== 'base') throw new Error('Base network required.');
    return createBaseWagmiConfig(activeNetwork);
  });
  const [queryClient] = useState(() => new QueryClient());
  return <PublicWagmiProvider config={config}><QueryClientProvider client={queryClient}><ToastProvider>
    <BasePublicAccountProvider>{children}</BasePublicAccountProvider>
  </ToastProvider></QueryClientProvider></PublicWagmiProvider>;
}

function BaseWeb3Provider({ network, children }: { network: BaseNetwork; children: ReactNode }) {
  const { wallet: activeWallet } = useActiveWallet();
  // A network switch reloads the document; theme changes must retain clients and cache.
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() => createBaseWagmiConfig(network));
  const selectWallet = useCallback<SetActiveWalletForWagmiType>(({ wallets, user }) =>
    selectLinkedWallet(wallets, linkedEvmAddresses(user?.linkedAccounts ?? []), activeWallet?.address), [activeWallet?.address]);
  return <QueryClientProvider client={queryClient}>
    <WagmiProvider config={config} setActiveWalletForWagmi={selectWallet}>{children}</WagmiProvider>
  </QueryClientProvider>;
}
