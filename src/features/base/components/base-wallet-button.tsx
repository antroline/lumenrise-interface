'use client';

import { useState } from 'react';
import { useConnection, useSwitchChain } from 'wagmi';
import { useActiveWallet, useConnectWallet, useLogin, usePrivy, useWallets } from '@privy-io/react-auth';
import { ArrowLeftRight, ChevronDown, Copy, LogOut, Wallet } from 'lucide-react';
import { ProfileAvatar } from '@/components/profile-avatar';
import { NetworkMenuItems } from '@/components/shell/network-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotify } from '@/components/ui/toast';
import { shortAddress } from '@/lib/connections';
import { useNetwork } from '@/lib/networks/context';
import { cn } from '@/lib/utils';
import type { WalletControlProps } from '@/lib/wallet-control';
import { linkedEvmAddresses, selectLinkedWallet, sameEvmAddress } from '@/lib/base/wallet';
import { useLaunchpad } from '@/lib/launchpad';

export function BaseWalletButton({ compact = false, className, menuSide = 'bottom', showNetwork = true }: WalletControlProps) {
  const { ready, authenticated, user } = usePrivy();
  const connection = useConnection();
  const { switchChainAsync } = useSwitchChain();
  const { logout, syncWallets, accountReady, account } = useLaunchpad();
  const { wallets, ready: walletsReady } = useWallets();
  const { wallet: activeWallet, setActiveWallet } = useActiveWallet();
  const { activeNetwork } = useNetwork();
  const notify = useNotify();
  const [actionPending, setActionPending] = useState(false);
  const { login } = useLogin({ onError: error => {
    if (String(error) !== 'exited_auth_flow') notify('Could not sign in. Please try again.', { tone: 'error' });
  } });
  const { connectWallet } = useConnectWallet({ onError: error => {
    if (String(error) !== 'exited_auth_flow') notify('Could not connect the wallet. Please try again.', { tone: 'error' });
  } });
  const linkedWallets = wallets.filter(entry => linkedEvmAddresses(user?.linkedAccounts ?? []).some(address => sameEvmAddress(entry.address, address)));
  const wallet = selectLinkedWallet(linkedWallets, linkedEvmAddresses(user?.linkedAccounts ?? []), activeWallet?.address);
  const loading = !ready || (authenticated && !walletsReady);
  const controlClass = cn('h-10 rounded-full bg-secondary text-foreground hover:bg-muted', compact && 'w-10 px-0', className);

  async function runAction(action: () => Promise<unknown>, failure: string) {
    if (actionPending) return;
    setActionPending(true);
    try {
      await action();
    } catch {
      notify(failure, { tone: 'error' });
    } finally {
      setActionPending(false);
    }
  }

  if (loading || !authenticated) {
    const label = loading ? 'Loading wallet…' : 'Connect wallet';
    return <Button variant="ghost" className={controlClass} disabled={loading} onClick={() => login()} aria-label={compact ? label : undefined}>
      <Wallet data-icon="inline-start" aria-hidden="true" />
      {!compact && label}
    </Button>;
  }

  const chainId = activeNetwork.blockchain === 'base' ? activeNetwork.chainId : null;
  const avatarUrl = account.status === 'registered' ? account.profile.avatarUrl : null;
  const wrongNetwork = wallet && chainId !== null && wallet.chainId !== `eip155:${chainId}`;

  return <DropdownMenu>
    <DropdownMenuTrigger render={
      <Button variant="ghost" className={cn(controlClass, 'gap-2', !compact && 'min-w-0 px-2.5')} disabled={actionPending}
        aria-label={wallet ? `Base wallet ${shortAddress(wallet.address)}` : 'Connect a Base wallet'}>
        {wallet ? <ProfileAvatar seed={wallet.address} avatarUrl={avatarUrl} size={24} radius={6} /> : <Wallet data-icon="inline-start" aria-hidden="true" />}
        {!compact && <span className="truncate">{wallet ? shortAddress(wallet.address) : 'Connect wallet'}</span>}
        {!compact && <ChevronDown data-icon="inline-end" aria-hidden="true" />}
      </Button>
    } />
    <DropdownMenuContent side={menuSide} align={menuSide === 'top' ? 'start' : 'end'} sideOffset={8}
      className="w-62 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-card p-2 text-card-foreground ring-border">
      {wallet && <>
        <div className="flex min-w-0 items-center gap-2.5 px-2 py-2">
          <ProfileAvatar seed={wallet.address} avatarUrl={avatarUrl} size={36} radius={9} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={account.status === 'registered' ? account.profile.name : undefined}>
              {account.status === 'registered' ? account.profile.name : 'Connected wallet'}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground" title={wallet.address}>
              {shortAddress(wallet.address)}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="mx-1 my-2 bg-divider" />
      </>}
      <DropdownMenuGroup>
        <DropdownMenuLabel>{wallet ? activeNetwork.label : 'Signed in · No wallet connected'}</DropdownMenuLabel>
        {linkedWallets.length > 1 && <DropdownMenuRadioGroup aria-label="Active Base wallet" value={wallet?.address ?? ''} onValueChange={address => {
          const selected = linkedWallets.find(entry => sameEvmAddress(entry.address, address));
          if (selected) setActiveWallet(selected);
        }}>
          {linkedWallets.map(entry => <DropdownMenuRadioItem key={entry.address} value={entry.address} className="min-h-11">
            {entry.walletClientType === 'privy' ? 'App wallet' : 'External wallet'} · {shortAddress(entry.address)}
          </DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>}
        {wrongNetwork && <DropdownMenuItem className="min-h-11" disabled={actionPending} onClick={() => {
          if (chainId !== null) void runAction(async () => {
            if (!connection.connector || !connection.address || !sameEvmAddress(connection.address, wallet.address)) throw new Error('Select the linked wallet first.');
            const connector = connection.connector;
            await switchChainAsync({ chainId });
            if (await connector.getChainId() !== chainId) throw new Error('Wallet network mismatch.');
          }, 'Could not verify the selected Base network. Signing remains blocked.');
        }}>
          <ArrowLeftRight />Switch wallet to {activeNetwork.label}
        </DropdownMenuItem>}
        {wallet && <DropdownMenuItem className="min-h-11" disabled={actionPending} onClick={() => void runAction(async () => {
          await navigator.clipboard.writeText(wallet.address);
          notify('Address copied to clipboard.', { tone: 'success' });
        }, 'Could not copy the address. Copy it from this menu instead.')}><Copy />Copy address</DropdownMenuItem>}
        {!wallet && <DropdownMenuItem className="min-h-11" disabled={actionPending} onClick={() => connectWallet()}>
          <Wallet />Connect existing wallet
        </DropdownMenuItem>}
        {accountReady && syncWallets && <DropdownMenuItem className="min-h-11" disabled={actionPending} onClick={() => void runAction(async () => {
          const result = await syncWallets();
          if (!result.ok) throw new Error(result.error);
          notify('Linked wallets verified with LumenRise.', { tone: 'success' });
        }, 'Could not synchronize verified wallets. Check your account and try again.')}>
          <ArrowLeftRight />Sync linked wallets
        </DropdownMenuItem>}
      </DropdownMenuGroup>
      {showNetwork && <><DropdownMenuSeparator /><NetworkMenuItems /></>}
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive" className="min-h-11" disabled={actionPending}
          onClick={logout}><LogOut />Sign out</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
