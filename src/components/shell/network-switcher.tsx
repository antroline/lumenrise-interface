'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNetwork } from '@/lib/networks/context';
import type { Blockchain } from '@/lib/networks/types';
import { cn } from '@/lib/utils';

function NetworkBrand({ blockchain, symbolOnly = false }: { blockchain: Blockchain; symbolOnly?: boolean }) {
  const label = blockchain === 'stellar' ? 'Stellar' : 'Base';
  if (!symbolOnly) return <span className="flex items-center gap-2.5"><span className="flex size-6 items-center justify-center"><NetworkBrand blockchain={blockchain} symbolOnly /></span><span translate="no" className="text-sm font-medium">{label}</span></span>;
  // Balance the heavier Base lettering optically; preserve each asset's aspect ratio.
  const width = blockchain === 'stellar' ? 22 : 18;
  const aspectRatio = blockchain === 'stellar' ? 31.3177 / 26 : 1;
  const height = Math.round(width / aspectRatio);
  const asset = `/branding/networks/${blockchain}-symbol`;

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
          className={cn('relative h-11 w-full justify-start gap-2 px-3', compact && 'size-10 justify-center px-0', className)}
          aria-label={`Network: ${activeNetwork.label}`}
          title={activeNetwork.label}
        >
          <NetworkBrand blockchain={activeNetwork.blockchain} symbolOnly={compact} />
          {compact && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded border border-border bg-card px-1 text-[10px] font-semibold leading-4 text-card-foreground">{activeNetwork.environment === 'testnet' ? 'T' : 'M'}</span>}
          {!compact && <>
            <span className="ml-auto rounded border border-border bg-card px-2 py-0.5 text-xs font-semibold text-card-foreground">{activeNetwork.environment === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
            <ChevronDown data-icon="inline-end" aria-hidden="true" className="text-muted-foreground transition-transform duration-150 in-aria-expanded:rotate-180 motion-reduce:transition-none" />
          </>}
        </Button>
      } />
      <DropdownMenuContent side={compact ? 'right' : 'bottom'} align="start" sideOffset={8} className="w-64 min-w-0 max-w-[calc(100vw-2rem)] overscroll-contain p-2">
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
      <DropdownMenuRadioGroup className="flex flex-col gap-1" aria-label="Blockchain" value={activeNetwork.blockchain} onValueChange={value => {
        if (value === 'stellar' || value === 'base') switchBlockchain(value);
      }}>
        {(['stellar', 'base'] as const).map(blockchain => (
          <DropdownMenuRadioItem
            key={blockchain}
            value={blockchain}
            label={blockchain === 'stellar' ? 'Stellar' : 'Base'}
            className="min-h-14 cursor-pointer rounded-lg py-2 pl-3 pr-9 data-checked:bg-secondary hover:bg-muted focus:bg-muted focus:text-foreground"
            aria-label={blockchain === 'stellar' ? 'Stellar' : 'Base'}
          >
            <span className="flex flex-col gap-1">
              <NetworkBrand blockchain={blockchain} />
              <span className="text-xs text-muted-foreground">{activeNetwork.environment === 'testnet' ? (blockchain === 'base' ? 'Sepolia · Test funds' : 'Testnet · Test funds') : 'Mainnet · Real funds'}</span>
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
    <DropdownMenuSeparator className="mx-1 my-2" />
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-3 pb-2 pt-1">Environment</DropdownMenuLabel>
      <DropdownMenuRadioGroup className="flex flex-col gap-1" aria-label="Network environment" value={activeNetwork.id} onValueChange={value => {
        const network = networks.find(entry => entry.id === value && entry.blockchain === activeNetwork.blockchain);
        if (network) switchNetwork(network.id);
      }}>
        {networks.filter(entry => entry.blockchain === activeNetwork.blockchain).map(network => (
          <DropdownMenuRadioItem
            key={network.id}
            value={network.id}
            label={network.environment === 'mainnet' ? 'Mainnet' : 'Testnet'}
            aria-label={`${network.label} · ${network.environment === 'mainnet' ? 'Real funds' : 'Test funds'}`}
            className="min-h-14 cursor-pointer rounded-lg py-2 pl-3 pr-9 data-checked:bg-secondary hover:bg-muted focus:bg-muted focus:text-foreground"
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
