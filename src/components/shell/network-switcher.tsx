'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNetwork } from '@/lib/networks/context';
import type { Blockchain } from '@/lib/networks/types';
import { cn } from '@/lib/utils';

function NetworkBrand({ blockchain, symbolOnly = false }: { blockchain: Blockchain; symbolOnly?: boolean }) {
  const label = blockchain === 'stellar' ? 'Stellar' : 'Base';
  // Balance the heavier Base lettering optically; preserve each asset's aspect ratio.
  const width = symbolOnly ? (blockchain === 'stellar' ? 22 : 18) : (blockchain === 'stellar' ? 76 : 64);
  const aspectRatio = symbolOnly ? (blockchain === 'stellar' ? 31.3177 / 26 : 1) : (blockchain === 'stellar' ? 106 / 26 : 1280 / 323.84);
  const height = Math.round(width / aspectRatio);
  const asset = `/branding/networks/${blockchain}-${symbolOnly ? 'symbol' : 'lockup'}`;

  if (blockchain === 'base' && symbolOnly) {
    return <Image src={`${asset}.svg`} alt={label} width={width} height={height} className="h-auto shrink-0" />;
  }

  return <>
    <Image src={`${asset}-light.svg`} alt={label} width={width} height={height} className="block h-auto shrink-0 dark:hidden" />
    <Image src={`${asset}-dark.svg`} alt={label} width={width} height={height} className="hidden h-auto shrink-0 dark:block" />
  </>;
}

export function NetworkSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { activeNetwork } = useNetwork();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="secondary"
          className={cn('h-11 w-full justify-start gap-2 px-3', compact && 'size-10 justify-center px-0', className)}
          aria-label={`Network: ${activeNetwork.label}`}
          title={activeNetwork.label}
        >
          <NetworkBrand blockchain={activeNetwork.blockchain} symbolOnly={compact} />
          {!compact && <>
            <Badge size="sm" className="ml-auto">{activeNetwork.environment === 'testnet' ? 'Testnet' : 'Mainnet'}</Badge>
            <ChevronDown data-icon="inline-end" aria-hidden="true" className="text-muted-foreground transition-transform duration-150 in-aria-expanded:rotate-180 motion-reduce:transition-none" />
          </>}
        </Button>
      } />
      <DropdownMenuContent side={compact ? 'right' : 'top'} align="start" sideOffset={8} className="w-64 min-w-0 max-w-[calc(100vw-2rem)] p-2">
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
      <DropdownMenuLabel className="px-3 pb-2 pt-1">Blockchain</DropdownMenuLabel>
      <DropdownMenuRadioGroup aria-label="Blockchain" value={activeNetwork.blockchain} onValueChange={value => {
        if (value === 'stellar' || value === 'base') switchBlockchain(value);
      }}>
        {(['stellar', 'base'] as const).map(blockchain => (
          <DropdownMenuRadioItem
            key={blockchain}
            value={blockchain}
            label={blockchain === 'stellar' ? 'Stellar' : 'Base'}
            className="min-h-12 cursor-pointer rounded-lg pl-3 pr-9 data-checked:bg-secondary focus:bg-secondary focus:text-foreground"
            aria-label={blockchain === 'stellar' ? 'Stellar' : 'Base'}
          >
            <NetworkBrand blockchain={blockchain} />
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
    <DropdownMenuSeparator className="mx-1 my-2" />
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-3 pb-2 pt-1">Environment</DropdownMenuLabel>
      <DropdownMenuRadioGroup aria-label="Network environment" value={activeNetwork.id} onValueChange={value => {
        const network = networks.find(entry => entry.id === value && entry.blockchain === activeNetwork.blockchain);
        if (network) switchNetwork(network.id);
      }}>
        {networks.filter(entry => entry.blockchain === activeNetwork.blockchain).map(network => (
          <DropdownMenuRadioItem
            key={network.id}
            value={network.id}
            label={network.environment === 'mainnet' ? 'Mainnet' : 'Testnet'}
            aria-label={network.label}
            className="min-h-14 cursor-pointer rounded-lg py-2 pl-3 pr-9 data-checked:bg-secondary focus:bg-secondary focus:text-foreground"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{network.environment === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
              <span className="text-xs text-muted-foreground">
                {network.environment === 'mainnet' ? 'Real funds' : network.blockchain === 'base' ? 'Sepolia · Test funds' : 'Test funds'}
              </span>
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  </>;
}
