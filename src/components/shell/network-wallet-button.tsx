'use client';

import dynamic from 'next/dynamic';
import type { WalletControlProps } from '@/lib/wallet-control';
import { useNetwork } from '@/lib/networks/context';
import { WalletButton } from './wallet-button';
import { useConfiguration } from '@/lib/configuration';
import { Button } from '@/components/ui/button';

const BaseWalletButton = dynamic(() => import('@/features/base/components/base-wallet-button').then(module => module.BaseWalletButton), { ssr: false });

/** Keep Stellar hooks inside their provider, including in the shared shell. */
export function NetworkWalletButton(props: WalletControlProps) {
  const { activeNetwork } = useNetwork();
  const config = useConfiguration();
  if (activeNetwork.blockchain === 'base' && !config.auth.appId.trim())
    return <Button variant="ghost" disabled className={props.className}>Base sign-in unavailable</Button>;
  return activeNetwork.blockchain === 'base'
    ? <BaseWalletButton {...props} />
    : <WalletButton {...props} />;
}
