'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNetwork } from '@/lib/networks/context';
import { cn } from '@/lib/utils';

export function NetworkSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { activeNetwork } = useNetwork();
  const chainLabel = activeNetwork.blockchain === 'stellar' ? 'Stellar' : 'Base';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="secondary"
          className={cn('h-11 w-full justify-start gap-2.5 px-3', compact && 'size-10 justify-center px-0', className)}
          aria-label={`Network: ${activeNetwork.label}`}
          title={activeNetwork.label}
        >
          <Globe data-icon="inline-start" aria-hidden="true" />
          {!compact && <>
            <span className="flex-1 text-left">{chainLabel}</span>
            <span className="text-xs text-muted-foreground">{activeNetwork.environment === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </>}
        </Button>
      } />
      <DropdownMenuContent side={compact ? 'right' : 'top'} align="start" sideOffset={8} className="min-w-56">
        <NetworkMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The sidebar, mobile drawer, and wallet menu share one set of choices. */
export function NetworkMenuItems() {
  const { activeNetwork, networks, switchNetwork, switchBlockchain } = useNetwork();
  return <>
    <DropdownMenuGroup>
      <DropdownMenuLabel>Network</DropdownMenuLabel>
      <DropdownMenuRadioGroup aria-label="Blockchain" value={activeNetwork.blockchain} onValueChange={value => {
        if (value === 'stellar' || value === 'base') switchBlockchain(value);
      }}>
        <DropdownMenuRadioItem value="stellar" className="min-h-11">Stellar</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="base" className="min-h-11">Base</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuLabel>Environment</DropdownMenuLabel>
      <DropdownMenuRadioGroup aria-label="Network environment" value={activeNetwork.id} onValueChange={value => {
        const network = networks.find(entry => entry.id === value && entry.blockchain === activeNetwork.blockchain);
        if (network) switchNetwork(network.id);
      }}>
        {networks.filter(entry => entry.blockchain === activeNetwork.blockchain).map(network => (
          <DropdownMenuRadioItem key={network.id} value={network.id} className="min-h-11">
            {network.environment === 'mainnet' ? 'Mainnet' : network.blockchain === 'base' ? 'Sepolia · Testnet' : 'Testnet'}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  </>;
}
