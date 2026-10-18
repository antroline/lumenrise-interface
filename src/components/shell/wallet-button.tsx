'use client';

import Link from 'next/link';
import { ChevronDown, Copy, LogOut, Settings, UserRound, Wallet } from 'lucide-react';
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
  const { isSignedIn, address, account, login, logout, loginPending, loginPhase, notify } =
    useLaunchpad();

  const { profile } = useBlux();

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
        loading={loginPending}
        aria-label={compact ? label : undefined}
      >
        <Wallet data-icon="inline-start" aria-hidden="true" />
        {!compact && label}
      </Button>
    );
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      notify('Address copied to clipboard.', { tone: 'success' });
    } catch {
      notify(
        'Could not copy the address. Copy it from your account page instead.',
        { tone: 'error' },
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
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-card p-2 text-card-foreground ring-border"
      >
        <div className="flex min-w-0 items-center gap-3 px-3 py-3">
          <Blockie seed={address} size={40} radius={10} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={account.status === 'registered' ? account.profile.name : undefined}>
              {account.status === 'registered' ? account.profile.name : 'Connected wallet'}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground" title={address}>
              {shortAddress(address)}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="mx-1 my-2 bg-divider" />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 pb-2 text-xs font-medium text-muted-foreground">
            Network display
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value="Testnet"
            className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/70 p-1"
          >
            <DropdownMenuRadioItem value="Testnet" className="min-h-11 rounded-lg pl-3 text-xs font-medium focus:bg-card focus:text-foreground data-checked:bg-card data-checked:text-foreground">
              Testnet
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="Mainnet" disabled className="min-h-11 gap-1 rounded-lg pl-2 text-xs font-medium focus:bg-card focus:text-foreground data-checked:bg-card data-checked:text-foreground">
              Mainnet
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-1 my-2 bg-divider" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="min-h-11 gap-3 rounded-lg px-3 focus:bg-secondary focus:text-foreground" onClick={() => void profile()}>
            <UserRound className="text-muted-foreground" />
            Wallet profile
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-3 rounded-lg px-3 focus:bg-secondary focus:text-foreground" render={<Link href={settingsItem.href} />}>
            <Settings className="text-muted-foreground" />
            Account settings
          </DropdownMenuItem>

          <DropdownMenuItem className="min-h-11 gap-3 rounded-lg px-3 focus:bg-secondary focus:text-foreground" onClick={() => void copyAddress()}>
            <Copy className="text-muted-foreground" />
            Copy address
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-1 my-2 bg-divider" />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" className="min-h-11 gap-3 rounded-lg px-3" onClick={logout}>
            <LogOut />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

