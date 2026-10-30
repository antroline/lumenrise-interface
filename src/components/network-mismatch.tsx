'use client';

import Link from 'next/link';
import { useNetwork } from '@/lib/networks/context';
import { networkLabel, networkSwitchHref } from '@/lib/networks/registry';
import { buttonVariants } from './ui/button';
import { NetworkNotice } from './network-notice';

export function NetworkMismatch() {
  const { activeNetwork, requestedNetworkId } = useNetwork();
  if (!requestedNetworkId) return null;
  const label = networkLabel(requestedNetworkId);
  return <NetworkNotice
    title={`This project is on ${label}`}
    description={`Your selected network is ${activeNetwork.label}. Change networks to browse projects on ${label}.`}
  >
    <Link href={networkSwitchHref(requestedNetworkId)} className={buttonVariants()}>Switch to {label}</Link>
  </NetworkNotice>;
}
