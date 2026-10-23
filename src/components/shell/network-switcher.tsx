'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getConfiguration } from '@/lib/api/config';
import { API_NETWORK } from '@/lib/stellar/network';
import { cn } from '@/lib/utils';

export function NetworkSwitcher({ compact = false }: { compact?: boolean }) {
  const label = API_NETWORK === 'public' ? 'Mainnet' : 'Testnet';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            className={cn('h-11 w-full justify-start gap-2.5 px-3', compact && 'size-10 justify-center px-0')}
            aria-label={`Network: ${label}`}
            title={`Network: ${label}`}
          >
            <Globe data-icon="inline-start" aria-hidden="true" />
            {!compact && (
              <>
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent side={compact ? 'right' : 'top'} align="start" sideOffset={8} className="w-56 max-w-[calc(100vw-1.5rem)]">
        <NetworkMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NetworkMenuItems() {
  const supported = getConfiguration().network.supported;

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Network</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label="Stellar network"
        value={API_NETWORK}
        onValueChange={(network) => {
          if (network !== API_NETWORK && supported.some(value => value === network))
            window.location.assign('/launches?network=' + network);
        }}
      >
        <DropdownMenuRadioItem value="testnet" disabled={!supported.includes('testnet')} className="min-h-11">
          Testnet
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="public" disabled={!supported.includes('public')} className="min-h-11">
          Mainnet
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
