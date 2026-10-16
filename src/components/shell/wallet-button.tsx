'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Copy, LogOut, Settings, Wallet } from 'lucide-react';
import { Blockie } from '@/components/blockie';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { shortAddress } from '@/lib/connections';
import { useLaunchpad } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { useBlux } from '@bluxcc/react';
import { settingsItem } from './navigation';

export function WalletButton({
  compact = false,
  menuSide = 'bottom',
  className,
}: {
  /** Icon-only trigger for narrow containers such as a collapsed sidebar. */
  compact?: boolean;
  menuSide?: 'bottom' | 'top' | 'right';
  className?: string;
}) {
  const { isSignedIn, address, login, logout, loginPending, loginPhase, notify } =
    useLaunchpad();

  const { profile } = useBlux();
  const [displayNetwork, setDisplayNetwork] = useState<'Testnet' | 'Mainnet'>(
    'Testnet',
  );

  if (!isSignedIn || !address) {
    const label = loginPending
      ? loginPhase === 'checking'
        ? 'Checking…'
        : 'Connecting…'
      : 'Connect wallet';
    return (
      <Button
        className={cn('h-10 rounded-full', compact && 'w-10 px-0', className)}
        onClick={() => void login()}
        disabled={loginPending}
        aria-label={compact ? label : undefined}
      >
        <Wallet data-icon="inline-start" />
        {!compact && label}
      </Button>
    );
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      notify('Address copied to clipboard.');
    } catch {
      notify(
        'Could not copy the address. Copy it from your account page instead.',
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              'h-10 gap-2 rounded-full bg-ink px-2.5 font-mono text-small font-medium text-white hover:bg-ink/85 hover:text-white aria-expanded:bg-ink/85 dark:bg-lime dark:text-ink dark:hover:bg-lime-hover dark:hover:text-ink dark:aria-expanded:bg-lime-hover',
              compact && 'w-10 px-0',
              className,
            )}
          >
            <Blockie seed={address} size={24} radius={6} />
            {!compact && (
              <span className="hidden sm:inline">{shortAddress(address)}</span>
            )}
            <span className={compact ? 'sr-only' : 'sr-only sm:hidden'}>
              Wallet menu
            </span>
            {!compact && (
              <ChevronDown className="size-3.5 text-white/70 dark:text-ink/70" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        side={menuSide}
        align={menuSide === 'top' ? 'start' : 'end'}
        className="w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pt-2">
            Network · display only
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={displayNetwork}
            onValueChange={(value) => {
              if (value === 'Testnet' || value === 'Mainnet')
                setDisplayNetwork(value);
            }}
          >
            <DropdownMenuRadioItem value="Testnet">
              Testnet
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="Mainnet">
              Mainnet{' '}
              <span className="text-caption text-muted-foreground">
                Preview
              </span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <p className="px-2 py-1 text-caption leading-relaxed text-muted-foreground">
            Wallet remains on Stellar Testnet.
          </p>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void profile()}>
            <Settings />
            Wallet Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={settingsItem.href} />}>
            <Settings />
            Account settings
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => void copyAddress()}>
            <Copy />
            Copy address
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout}>
            <LogOut />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

