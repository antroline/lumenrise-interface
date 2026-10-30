'use client';

import { useNetwork } from '@/lib/networks/context';
import { Button } from '@/components/ui/button';
import { NetworkNotice } from '@/components/network-notice';

export function BaseUnavailable() {
  const { activeNetwork, switchBlockchain } = useNetwork();
  return (
    <NetworkNotice
      title="This feature is Stellar-only"
      description={`You’re viewing ${activeNetwork.label}. Reputation, Stellar evidence, social connections, developer APIs, and policy features are not supported on Base. Projects and account settings remain available.`}
    >
      <Button onClick={() => switchBlockchain('stellar')}>Switch to Stellar</Button>
    </NetworkNotice>
  );
}
