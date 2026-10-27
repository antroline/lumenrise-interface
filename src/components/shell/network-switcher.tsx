'use client';

import { ArrowLeftRight, Globe } from 'lucide-react';
import { useBlux, useSwitchNetwork } from '@bluxcc/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { getConfiguration } from '@/lib/api/config';
import { API_NETWORK } from '@/lib/stellar/network';
import { cn } from '@/lib/utils';

export function NetworkSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const isMainnet = API_NETWORK === 'public';
  const label = isMainnet ? 'Mainnet' : 'Testnet';
  const nextNetwork = isMainnet ? 'testnet' : 'public';
  const nextLabel = isMainnet ? 'Testnet' : 'Mainnet';
  const { isReady } = useBlux();
  const { networks, switchNetwork } = useSwitchNetwork();
  const canSwitch = isReady && getConfiguration().network.supported.includes(nextNetwork);

  return (
    <Button
      variant="secondary"
      className={cn('group/network h-11 w-full justify-start gap-2.5 px-3', compact && 'size-10 flex-col justify-center gap-0.5 px-0', className)}
      disabled={!canSwitch}
      aria-label={`Current network: ${label}. Switch to ${nextLabel}`}
      title={canSwitch ? `Switch to ${nextLabel}` : `Current network: ${label}. Switching unavailable`}
      onClick={() => {
        if (!canSwitch) return;
        switchNetwork(isMainnet ? networks.testnet : networks.mainnet);
        window.location.assign('/projects?network=' + nextNetwork);
      }}
    >
      <span className={cn('flex shrink-0 items-center justify-center', compact ? 'size-4' : 'size-7 rounded-full', isMainnet ? 'text-ok' : 'text-warn', !compact && (isMainnet ? 'bg-ok-soft' : 'bg-warn-soft'))}>
        <Globe className={compact ? 'size-3.5' : 'size-4'} aria-hidden="true" />
      </span>
      {compact && <span className="text-[10px] leading-none font-semibold">{isMainnet ? 'Main' : 'Test'}</span>}
      {!compact && (
        <>
          <span className="flex-1 text-left">{label}</span>
          <ArrowLeftRight className="size-3.5 text-muted-foreground transition-colors group-hover/network:text-foreground motion-reduce:transition-none" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}

export function NetworkMenuItems() {
  const supported = getConfiguration().network.supported;
  const { isReady } = useBlux();
  const { networks, switchNetwork } = useSwitchNetwork();

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Network</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label="Stellar network"
        value={API_NETWORK}
        onValueChange={(network) => {
          if (!isReady || network === API_NETWORK || !supported.some(value => value === network)) return;
          switchNetwork(network === 'public' ? networks.mainnet : networks.testnet);
          window.location.assign('/projects?network=' + network);
        }}
      >
        <DropdownMenuRadioItem value="testnet" disabled={!isReady || !supported.includes('testnet')} className="min-h-11">
          Testnet
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="public" disabled={!isReady || !supported.includes('public')} className="min-h-11">
          Mainnet
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
