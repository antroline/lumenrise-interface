'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useActiveWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LaunchpadContext, type AccountState, type AccountActionResult } from '@/lib/launchpad';
import { deleteAvatar, getProfile, registerAccount, resolveAccount, updateProfile, type ProfileUpdateInput } from '@/lib/api/auth';
import { setApiUserId, setBaseAuthentication, ApiError } from '@/lib/api/client';
import { saveAuthReturnTo } from '@/lib/auth-return';
import { useNotify } from '@/components/ui/toast';
import { linkedEvmAddresses, selectLinkedWallet, sameEvmAddress } from '@/lib/base/wallet';

export function BasePublicAccountProvider({ children }: { children: ReactNode }) {
  const notify = useNotify();
  const unavailable = async (): Promise<AccountActionResult> => ({ ok: false, error: 'Base sign-in is not configured by the server.' });
  return <LaunchpadContext.Provider value={{
    isSignedIn: false, account: { status: 'signed-out' }, accountReady: false,
    loginPending: false, loginPhase: null,
    login: async () => notify('Base sign-in is not configured by the server.', { tone: 'warning' }),
    logout: () => {}, notify, retryStatusCheck: () => {},
    register: unavailable, updateProfile: unavailable, updateAvatar: unavailable, removeAvatar: unavailable,
    refreshProfile: async () => {},
  }}>{children}</LaunchpadContext.Provider>;
}

export function BaseAccountProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { wallet: activeWallet } = useActiveWallet();
  const wallet = selectLinkedWallet(wallets, linkedEvmAddresses(user?.linkedAccounts ?? []), activeWallet?.address);
  const address = wallet?.address;
  const userId = authenticated ? user?.id ?? null : null;
  const identity = userId ? `${userId}:${address?.toLowerCase() ?? ''}` : null;
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const notify = useNotify();
  const [snapshot, setSnapshot] = useState<{ identity: string | null; account: AccountState }>({ identity: null, account: { status: 'signed-out' } });
  const [nonce, setNonce] = useState(0);
  const latest = useRef(identity);
  const session = useRef<object | null>(null);
  const busy = useRef(false);
  const revision = useRef(0);
  const tokenGetter = useRef(getAccessToken);
  const account: AccountState = snapshot.identity === identity ? snapshot.account : identity ? { status: 'checking' } : { status: 'signed-out' };

  useLayoutEffect(() => {
    const current = {};
    session.current = current;
    latest.current = identity;
    setApiUserId(userId);
    if (userId) setBaseAuthentication({
      userId,
      getAccessToken: () => tokenGetter.current(),
      onExpired: () => {
        if (session.current !== current) return;
        session.current = null;
        setApiUserId(null);
        setBaseAuthentication(null);
        setSnapshot({ identity, account: { status: 'error', message: 'Your Base session expired. Sign out and sign in again.' } });
      },
    });
    else setBaseAuthentication(null);
    return () => {
      if (session.current === current) session.current = null;
      setApiUserId(null); setBaseAuthentication(null);
    };
  }, [userId, identity]);
  useLayoutEffect(() => { tokenGetter.current = getAccessToken; }, [getAccessToken]);

  useEffect(() => {
    const controller = new AbortController();
    if (!userId || !ready || !walletsReady) return;
    const publish = (value: AccountState) => {
      if (!controller.signal.aborted && latest.current === identity) setSnapshot({ identity, account: value });
    };
    if (!address) {
      publish({ status: 'error', message: 'Connect a verified EVM wallet linked to your Privy account, then retry.' });
      return;
    }
    publish({ status: 'checking' });
    resolveAccount({ userId, address, signal: controller.signal }).then(result => {
      if (controller.signal.aborted || latest.current !== identity) return;
      if (result.registered && result.name.trim()) {
        publish({ status: 'registered', profile: { ...result, addresses: linkedEvmAddresses(user?.linkedAccounts ?? []) } });
      } else {
        if (pathname !== '/register') {
          saveAuthReturnTo();
          router.push(`/register${window.location.search}`);
        }
        publish({ status: 'unregistered' });
      }
    }).catch(error => {
      if (!controller.signal.aborted) publish({ status: 'error', message: error instanceof Error ? error.message : 'Could not verify your Base account.' });
    });
    return () => controller.abort();
    // Route changes must not resolve the same identity again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, identity, address, ready, walletsReady, nonce]);

  async function action(run: () => Promise<void>): Promise<AccountActionResult> {
    if (busy.current) return { ok: false, error: 'An account update is already running.' };
    const started = session.current;
    if (!started || !userId || latest.current !== identity) return { ok: false, error: 'Sign in to Base first.' };
    busy.current = true;
    try {
      await run();
      return session.current === started ? { ok: true } : { ok: false, error: 'Your account changed. Try again.' };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'The account update failed.' };
    } finally { busy.current = false; }
  }
  const mergeProfile = useCallback((profile: Awaited<ReturnType<typeof getProfile>>, started: object | null) => {
    if (!started || session.current !== started) return;
    revision.current++;
    setSnapshot(current => current.identity === latest.current && current.account.status === 'registered'
      ? { ...current, account: { status: 'registered', profile: { ...current.account.profile, ...profile } } }
      : current);
  }, []);
  const refreshProfile = useCallback(async () => {
    const started = session.current, version = revision.current;
    try {
      const profile = await getProfile();
      if (version === revision.current) mergeProfile(profile, started);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setApiUserId(null);
    }
  }, [mergeProfile]);
  const saveProfile = (input: ProfileUpdateInput) => action(async () => {
    const started = session.current;
    const profile = await updateProfile(input);
    mergeProfile(profile, started);
  });
  return <LaunchpadContext.Provider value={{
    baseSigningSupported: !!wallet && !!address && !!user?.linkedAccounts.some(link => link.type === 'wallet' && link.chainType !== 'solana' && sameEvmAddress(link.address, address)) && !user?.linkedAccounts.some(link => link.type === 'smart_wallet' && sameEvmAddress(link.address, address)),
    isSignedIn: authenticated, address, account, accountReady: account.status === 'registered',
    loginPending: !ready || account.status === 'checking',
    loginPhase: account.status === 'checking' ? 'checking' : null,
    login: async destination => { saveAuthReturnTo(destination); login(); },
    logout: () => {
      latest.current = null;
      session.current = null;
      revision.current++;
      setApiUserId(null); setBaseAuthentication(null);
      void client.cancelQueries();
      client.clear();
      setSnapshot({ identity: null, account: { status: 'signed-out' } });
      void logout().catch(() => notify('Could not sign out. Try again.', { tone: 'error' }));
    },
    notify, retryStatusCheck: () => setNonce(value => value + 1),
    register: input => action(async () => {
      if (!address || !userId || account.status !== 'unregistered') throw new ApiError('A verified linked EVM wallet is required.', 'unauthenticated');
      const started = session.current;
      const profile = await registerAccount({ ...input, address });
      if (session.current === started) setSnapshot({ identity: latest.current, account: { status: 'registered', profile } });
    }),
    syncWallets: () => action(async () => {
      if (!address || account.status !== 'registered') throw new Error('Finish account registration and select a linked EVM wallet first.');
      const started = session.current;
      const profile = await registerAccount({ address, name: account.profile.name });
      if (session.current === started) setSnapshot({ identity: latest.current, account: { status: 'registered', profile } });
    }),
    updateProfile: saveProfile,
    updateAvatar: file => saveProfile({ avatar: file }),
    removeAvatar: () => action(async () => {
      const started = session.current;
      await deleteAvatar();
      if (account.status === 'registered') mergeProfile({ ...account.profile, avatarUrl: null }, started);
    }),
    refreshProfile,
  }}>{children}</LaunchpadContext.Provider>;
}
