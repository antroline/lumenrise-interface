'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BluxProvider, useBlux, useSwitchNetwork } from '@bluxcc/react';
import {
  deleteAvatar,
  getProfile,
  resolveAccount,
  registerAccount,
  updateProfile as updateUserProfile,
  type ProfileUpdateInput,
} from '@/lib/api/auth';
import {
  ApiError,
  configureApi,
  formatByteLimit,
  getApiUserId,
  isAbortError,
  setApiUserId,
} from '@/lib/api/client';
import { useConfiguration } from '@/lib/configuration';
import { getConfiguration } from '@/lib/api/config';
import { createBluxConfig } from '@/lib/blux-config';
import { getAuthProviderUserId } from '@/lib/auth-provider';
import { consumeAuthReturnTo, saveAuthReturnTo } from '@/lib/auth-return';
import { ToastProvider, useNotify } from '@/components/ui/toast';
import { API_NETWORK } from '@/lib/stellar/network';
import {
  LaunchpadContext,
  type AccountActionResult,
  type AccountState,
  type LaunchpadContextValue,
} from '@/lib/launchpad';

export default function ClientApp({
  children,
  apiBaseUrl,
}: {
  children: ReactNode;
  apiBaseUrl: string;
}) {
  const config = useConfiguration();
  const bluxConfig = useMemo(() => createBluxConfig(config, config.network.configurations[API_NETWORK]), [config]);
  // Public query observers start in child effects; configure their URL first.
  configureApi(apiBaseUrl);
  return (
    <BluxProvider config={bluxConfig}>
      <BluxNetworkSync />
      <ToastProvider>
        <LaunchpadProvider apiBaseUrl={apiBaseUrl}>{children}</LaunchpadProvider>
      </ToastProvider>
    </BluxProvider>
  );
}

function BluxNetworkSync() {
  const { isReady } = useBlux();
  const { networks, switchNetwork } = useSwitchNetwork();
  const network = API_NETWORK === 'public' ? networks.mainnet : networks.testnet;

  useEffect(() => {
    if (isReady) switchNetwork(network);
  }, [isReady, network, switchNetwork]);

  return null;
}

function statusCheckMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'http') {
      if (error.status === 400) {
        return 'Your sign-in ID or Stellar address is invalid. Sign out and sign in again.';
      }
      if (error.status === 401) {
        return 'Blux could not verify your sign-in and Stellar wallet. Sign out and sign in again.';
      }
      if (error.status === 403) {
        return 'This account has been deactivated. Contact support if you believe this is a mistake.';
      }
      if (error.status === 503) {
        return 'Account verification is temporarily unavailable. Try again in a moment.';
      }
      if (error.status === 409) {
        return 'Your sign-in and wallet conflict with existing profile ownership. Contact support.';
      }
    }
    return error.message;
  }
  return 'Something went wrong. Check your connection and try again.';
}

function photoTooLargeMessage(error: ApiError): string {
  const result = error.result;
  const maxBytes =
    result &&
    typeof result === 'object' &&
    typeof (result as { maxBytes?: unknown }).maxBytes === 'number'
      ? (result as { maxBytes: number }).maxBytes
      : null;
  return maxBytes
    ? `That photo is too large. The current limit is ${formatByteLimit(maxBytes)}.`
    : 'That photo is too large for the current server limit.';
}

function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'http') {
      switch (error.status) {
        case 400:
          return (
            error.serverMessage ?? 'Check your name and photo, then try again.'
          );
        case 401:
          return 'We could not verify your account with the authentication service. Sign out and sign in again.';
        case 403:
          return 'This account has been deactivated. Contact support if you believe this is a mistake.';
        case 409:
          return (
            error.serverMessage ??
            'This account is already linked to a different profile.'
          );
        case 413:
          return photoTooLargeMessage(error);
        case 422:
          return 'Your account needs a verified Stellar wallet before registering.';
        case 503:
          return 'The registration service is unavailable right now. Try again in a moment.';
        default:
          return error.message;
      }
    }
    return error.message;
  }
  return 'Something went wrong. Try again.';
}

function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'http' && error.status === 413) {
      return photoTooLargeMessage(error);
    }
    if (error.code === 'http' && error.status === 400) {
      return error.serverMessage ?? 'Check your name and photo, then try again.';
    }
  }
  if (error instanceof Error) return error.message;
  return 'We could not update your profile right now. Try again.';
}

const SESSION_EXPIRED_RESULT: AccountActionResult = {
  ok: false,
  error: 'Your account changed while the request was running. Try again.',
};

/** Terminal outcomes of the registration status check that login() awaits. */
type CheckOutcome = 'registered' | 'unregistered' | 'error' | 'cancelled';
const CHECKING_ACCOUNT: AccountState = { status: 'checking' };
const SIGNED_OUT_ACCOUNT: AccountState = { status: 'signed-out' };

function LaunchpadProvider({
  children,
  apiBaseUrl,
}: {
  children: ReactNode;
  apiBaseUrl: string;
}) {
  const blux = useBlux();
  const router = useRouter();
  const pathname = usePathname();
  const providerUserId = blux.isAuthenticated ? getAuthProviderUserId() : null;
  const selectedAddress = blux.user?.address;
  const userIdentity = blux.isAuthenticated && blux.user
    ? `${providerUserId}:${blux.user.authMethod}:${blux.user.authValue}:${blux.user.address}`
    : null;
  const [loginPhase, setLoginPhase] = useState<'connecting' | 'checking' | null>(
    null,
  );
  const notify = useNotify();
  const [snapshot, setSnapshot] = useState<{ identity: string | null; value: AccountState }>({
    identity: null, value: { status: 'signed-out' },
  });
  // Hide the previous profile immediately, before the account-change effect runs.
  const account: AccountState = snapshot.identity === userIdentity
    ? snapshot.value
    : userIdentity ? CHECKING_ACCOUNT : SIGNED_OUT_ACCOUNT;
  // Latest account state for async continuations that read it after awaits.
  const accountRef = useRef(account);
  const setAccount = useCallback((value: AccountState | ((current: AccountState) => AccountState)) => {
    const next = typeof value === 'function' ? value(accountRef.current) : value;
    accountRef.current = next;
    setSnapshot({ identity: userIdentity, value: next });
  }, [userIdentity]);
  const [statusNonce, setStatusNonce] = useState(0);
  const registerInFlight = useRef(false);
  const loginInFlight = useRef(false);
  const loginAttempt = useRef(0);
  // Each resolution owns a token; logout invalidates it synchronously, and
  // effect cleanup also invalidates requests when switching away and back.
  const session = useRef<object | null>(null);
  const profileRevision = useRef(0);
  const latestIdentity = useRef(userIdentity);
  // A login() call awaiting the registration status check resolves through
  // this ref when the check settles.
  const statusWaiter = useRef<{
    resolve: (outcome: CheckOutcome) => void;
  } | null>(null);
  // Guards the gap between routing a new user to /register and the route
  // change taking effect, so the disconnect rule below never fires early.
  const registerRoutePending = useRef(false);
  useEffect(() => {
    configureApi(apiBaseUrl);
  }, [apiBaseUrl]);

  useLayoutEffect(() => {
    if (latestIdentity.current !== null && latestIdentity.current !== userIdentity) {
      // A switch/disconnect also cancels a login still awaiting the Blux modal,
      // before it has installed its resolution waiter.
      loginAttempt.current++;
      loginInFlight.current = false;
      setLoginPhase(null);
      statusWaiter.current?.resolve('cancelled');
      statusWaiter.current = null;
    }
    latestIdentity.current = userIdentity;
    accountRef.current = account;
  }, [userIdentity, account]);

  const navigateToCompletion = useEffectEvent(() => {
    if (pathname.startsWith('/register')) return;
    saveAuthReturnTo();
    registerRoutePending.current = true;
    router.push('/register');
  });

  // Identifies the signed-in provider user against the LumenRise API and
  // resolves whether they still need to register. Until this settles, pages
  // must not guess either state. Signing out or switching users aborts the
  // in-flight check and discards its response. A login() call awaiting the
  // outcome is resolved first, so it can route before the new account state
  // renders anywhere.
  useEffect(() => {
    const token = {};
    session.current = token;
    const isCurrent = () => session.current === token && latestIdentity.current === userIdentity;
    const settleWaiter = (outcome: CheckOutcome) => {
      const waiter = statusWaiter.current;
      statusWaiter.current = null;
      waiter?.resolve(outcome);
    };
    if (!blux.isAuthenticated || !userIdentity) {
      setApiUserId(null);
      setAccount({ status: 'signed-out' });
      settleWaiter('cancelled');
      return;
    }
    const userId = providerUserId;
    const address = selectedAddress;
    if (!userId || !address) {
      setApiUserId(null);
      settleWaiter('error');
      setAccount({
        status: 'error',
        message:
          'We could not read your sign-in session. Sign out and sign in again.',
      });
      return;
    }
    setApiUserId(userId);
    let cancelled = false;
    const controller = new AbortController();
    setAccount({ status: 'checking' });
    resolveAccount({ userId, address, signal: controller.signal })
      .then((status) => {
        if (cancelled || !isCurrent()) return;
        const complete = status.registered && !!status.name.trim();
        // Route before publishing the unregistered state so its disconnect
        // guard cannot run before login() resumes (also covers restored sessions).
        if (!complete) navigateToCompletion();
        settleWaiter(complete ? 'registered' : 'unregistered');
        if (complete && status.registered) {
          setAccount({
            status: 'registered',
            profile: {
              userId,
              identityId: status.identityId,
              name: status.name,
              avatarUrl: status.avatarUrl,
              addresses: [address],
            },
          });
        } else {
          setAccount({ status: 'unregistered' });
        }
      })
      .catch((error) => {
        if (cancelled || !isCurrent() || isAbortError(error)) return;
        settleWaiter('error');
        setAccount({ status: 'error', message: statusCheckMessage(error) });
      });
    return () => {
      cancelled = true;
      if (session.current === token) session.current = null;
      controller.abort();
      settleWaiter('cancelled');
    };
    // userIdentity is the stable key for blux.user; statusNonce re-runs the
    // check on retry.
  }, [blux.isAuthenticated, userIdentity, selectedAddress, statusNonce, providerUserId, setAccount]);

  // The registration-navigation guard only needs to survive until the route
  // actually changes.
  useEffect(() => {
    registerRoutePending.current = false;
  }, [pathname]);

  // A connected wallet only makes sense with a completed LumenRise account.
  // When the status check finds no registration and the user is anywhere
  // outside the registration flow — including leaving /register without
  // finishing it — disconnect instead of keeping a dangling session.
  useEffect(() => {
    if (account.status !== 'unregistered') return;
    if (pathname.startsWith('/register')) return;
    if (registerRoutePending.current) return;
    blux.logout();
    setApiUserId(null);
    setAccount({ status: 'signed-out' });
    notify(
      'Account setup was not completed, so your wallet was disconnected.',
      { tone: 'warning' },
    );
  }, [account.status, pathname, blux, notify, setAccount]);

  const retryStatusCheck = useCallback(() => {
    setStatusNonce((nonce) => nonce + 1);
  }, []);

  const register = useCallback(
    async (input: {
      name: string;
      avatar?: File | null;
    }): Promise<AccountActionResult> => {
      if (registerInFlight.current) {
        return { ok: false, error: 'Your registration is already being submitted.' };
      }
      const userId = getApiUserId();
      const address = blux.user?.address;
      const token = session.current;
      const isCurrent = () => token !== null && session.current === token && latestIdentity.current === userIdentity;
      if (!userId || !address || accountRef.current.status !== 'unregistered' || !isCurrent()) {
        return {
          ok: false,
          error: 'Your session is not ready yet. Refresh the page and try again.',
        };
      }
      if (!getConfiguration().features.registration) return { ok: false, error: 'Registration is not configured right now.' };
      if (getConfiguration().rules.profile.walletRequired && !blux.user?.address) return { ok: false, error: 'Connect a Stellar wallet before registering.' };
      registerInFlight.current = true;
      try {
        const profile = await registerAccount({
          address,
          name: input.name,
          avatar: input.avatar ?? null,
        });
        if (!isCurrent()) return SESSION_EXPIRED_RESULT;
        if (!profile.name.trim()) return { ok: false, error: 'Enter a complete profile name and try again.' };
        setAccount({ status: 'registered', profile: { ...profile, userId } });
        return { ok: true };
      } catch (error) {
        if (!isCurrent()) return SESSION_EXPIRED_RESULT;
        if (
          error instanceof ApiError &&
          (error.code === 'timeout' || error.code === 'network')
        ) {
          // The request may still have reached the server. Never assume the
          // registration succeeded — confirm with a fresh status check.
          try {
            const status = await resolveAccount({ userId, address });
            if (!isCurrent()) return SESSION_EXPIRED_RESULT;
            if (status.registered && status.name.trim()) {
              setAccount({
                status: 'registered',
                profile: {
                  userId,
                  identityId: status.identityId,
                  name: status.name,
                  avatarUrl: status.avatarUrl,
                  addresses: [address],
                },
              });
              return { ok: true };
            }
            return {
              ok: false,
              error:
                'We could not reach the registration service. Your details are intact — try again.',
            };
          } catch {
            if (!isCurrent()) return SESSION_EXPIRED_RESULT;
            return {
              ok: false,
              error:
                'We could not confirm whether your registration completed. Check your connection and try again.',
            };
          }
        }
        return { ok: false, error: registrationErrorMessage(error) };
      } finally {
        registerInFlight.current = false;
      }
    },
    [blux.user?.address, userIdentity, setAccount],
  );

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput): Promise<AccountActionResult> => {
      const token = session.current;
      const isCurrent = () => token !== null && token === session.current && latestIdentity.current === userIdentity;
      const userId = getApiUserId();
      if (!userId) {
        return {
          ok: false,
          error: 'Your session is not ready yet. Refresh the page and try again.',
        };
      }
      try {
        const fresh = await updateUserProfile(input);
        if (!isCurrent()) return SESSION_EXPIRED_RESULT;
        profileRevision.current++;
        setAccount((current) =>
          current.status === 'registered'
            ? { status: 'registered', profile: { ...current.profile, ...fresh } }
            : current,
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, error: profileErrorMessage(error) };
      }
    },
    [userIdentity, setAccount],
  );

  const updateAvatar = useCallback((file: File) => updateProfile({ avatar: file }), [updateProfile]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    const token = session.current;
    const revision = profileRevision.current;
    const userId = getApiUserId();
    if (!userId) return;
    try {
      const fresh = await getProfile();
      if (!token || session.current !== token || latestIdentity.current !== userIdentity || revision !== profileRevision.current) return;
      setAccount((current) =>
        current.status === 'registered'
          ? { status: 'registered', profile: { ...current.profile, ...fresh } }
          : current,
      );
    } catch {
      // A background refresh failure keeps the last known profile; explicit
      // actions surface their own errors.
    }
  }, [userIdentity, setAccount]);

  const removeAvatar = useCallback(async (): Promise<AccountActionResult> => {
    const token = session.current;
    const userId = getApiUserId();
    if (!userId) {
      return {
        ok: false,
        error: 'Your session is not ready yet. Refresh the page and try again.',
      };
    }
    try {
      await deleteAvatar();
      if (!token || session.current !== token || latestIdentity.current !== userIdentity) return SESSION_EXPIRED_RESULT;
      profileRevision.current++;
      setAccount((current) =>
        current.status === 'registered'
          ? {
              status: 'registered',
              profile: { ...current.profile, avatarUrl: null },
            }
          : current,
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'We could not remove your photo. Try again.' };
    }
  }, [userIdentity, setAccount]);

  const login = useCallback(
    async (destination?: string) => {
      if (loginInFlight.current) return;
      if (blux.isAuthenticated && accountRef.current.status === 'registered') return;
      loginInFlight.current = true;
      const attempt = ++loginAttempt.current;
      saveAuthReturnTo(destination);
      try {
        if (!blux.isAuthenticated) {
          const loginRequest = blux.login();
          setLoginPhase('connecting');
          await loginRequest;
        }
        if (loginAttempt.current !== attempt) return;

        // The sign-in effect above is now running the registration status
        // check. Await its outcome: registered users stay on their page without the
        // registration page flashing in between, and new users land on the
        // registration form with their state already resolved.
        setLoginPhase('checking');
        const settled = accountRef.current.status;
        const outcome: CheckOutcome =
          settled === 'registered' ||
          settled === 'unregistered' ||
          settled === 'error'
            ? settled
            : await new Promise<CheckOutcome>((resolve) => {
                statusWaiter.current = { resolve };
              });

        if (loginAttempt.current !== attempt) return;
        if (outcome === 'registered') {
          // The registration page owns its redirect; consuming its target here
          // would race that effect. Other pages stay mounted after signing in.
          if (window.location.pathname !== '/register') consumeAuthReturnTo();
        } else if (outcome === 'unregistered') {
          if (pathname !== '/register' && !registerRoutePending.current) {
            registerRoutePending.current = true;
            router.push('/register');
          }
        } else if (outcome === 'error') {
          // The registration page renders the status error with a retry.
          if (pathname !== '/register') router.push('/register');
        }
        // 'cancelled': the sign-in changed while the check was running, so
        // routing follows the current account state instead.
      } catch (error) {
        if (loginAttempt.current !== attempt) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Blux could not open the login flow.';
        notify(message.replace(/^BLUX:\s*/i, ''), { tone: 'error' });
      } finally {
        if (loginAttempt.current === attempt) {
          loginInFlight.current = false;
          setLoginPhase(null);
        }
      }
    },
    [blux, router, pathname, notify],
  );

  const logout = useCallback(() => {
    session.current = null;
    loginAttempt.current++;
    loginInFlight.current = false;
    statusWaiter.current?.resolve('cancelled');
    statusWaiter.current = null;
    setLoginPhase(null);
    // Signing out is handled by the auth provider SDK; the API has no login
    // or logout endpoint of its own. Local account state resets so nothing
    // from the previous user leaks into the next session.
    blux.logout();
    setApiUserId(null);
    setAccount({ status: 'signed-out' });
    router.push('/');
    notify('You are now logged out.', { tone: 'success' });
  }, [blux, router, notify, setAccount]);

  const accountReady = account.status === 'registered';
  const effectiveLoginPhase = account.status === 'checking' ? 'checking' : loginPhase;
  const loginPending = effectiveLoginPhase !== null;

  const value = useMemo<LaunchpadContextValue>(
    () => ({
      isSignedIn: blux.isAuthenticated,
      address: blux.user?.address,
      loginPending,
      loginPhase: effectiveLoginPhase,
      login,
      logout,
      notify,
      account,
      accountReady,
      retryStatusCheck,
      register,
      refreshProfile,
      updateProfile,
      updateAvatar,
      removeAvatar,
    }),
    [
      blux.isAuthenticated,
      blux.user,
      loginPending,
      effectiveLoginPhase,
      login,
      logout,
      notify,
      account,
      accountReady,
      retryStatusCheck,
      register,
      refreshProfile,
      updateProfile,
      updateAvatar,
      removeAvatar,
    ],
  );

  return (
    <LaunchpadContext.Provider value={value}>
      <div className="min-h-screen">
        {children}
      </div>
    </LaunchpadContext.Provider>
  );
}
