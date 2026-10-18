'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BluxProvider, networks, useBlux } from '@bluxcc/react';
import {
  deleteAvatar,
  getProfile,
  getRegistrationStatus,
  registerAccount,
  uploadAvatar,
} from '@/lib/api/auth';
import {
  ApiError,
  configureApi,
  formatByteLimit,
  getApiUserId,
  isAbortError,
  setApiUserId,
} from '@/lib/api/client';
import { getAuthProviderUserId } from '@/lib/auth-provider';
import { consumeAuthReturnTo, saveAuthReturnTo } from '@/lib/auth-return';
import { hydrateBluxConnection } from '@/lib/connections';
import { ToastProvider, useNotify } from '@/components/ui/toast';
import { HORIZON_URL, NETWORK, SOROBAN_URL } from '@/lib/stellar/network';
import {
  LaunchpadContext,
  type AccountActionResult,
  type AccountState,
  type LaunchpadContextValue,
} from '@/lib/launchpad';

const DEMO_ADDRESS = 'GDEMO6K4KQPR5H7NQOL6UPRTMPL4TE6CYXW2LP7SSQ3J2BQY7X2Q';

const bluxConfig: Parameters<typeof BluxProvider>[0]['config'] = {
  appId: process.env.NEXT_PUBLIC_BLUX_APP_ID || 'launchpad-preview',
  appName: 'Launchpad',
  networks: [networks.testnet],
  showWalletUIs: false,
  defaultNetwork: networks.testnet,
  transports: {
    [NETWORK]: { horizon: HORIZON_URL, soroban: SOROBAN_URL },
  },
  loginMethods: ['wallet'],
  appearance: {
    background: '#ffffff',
    fieldBackground: '#f7f7f5',
    accentColor: '#0b0b0b',
    textColor: '#0b0b0b',
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
    borderRadius: 'var(--radius-2xl)',
    borderColor: '#e5e5e5',
    borderWidth: '1px',
    outlineColor: '#0b0b0b',
    outlineWidth: '2px',
    outlineRadius: 'var(--radius-2xl)',
    logo: `${window.location.origin}/branding/lumenrise-symbol-for-light-background.svg`,
    backdropBlur: '4px',
    backdropColor: 'rgba(11, 11, 11, 0.28)',
    boxShadow: '0 24px 70px rgba(11, 11, 11, 0.18)',
  },
};

export default function ClientApp({
  children,
  apiBaseUrl,
}: {
  children: ReactNode;
  apiBaseUrl: string;
}) {
  // Public query observers start in child effects; configure their URL first.
  configureApi(apiBaseUrl);
  return (
    <BluxProvider config={bluxConfig}>
      <ToastProvider>
        <LaunchpadProvider apiBaseUrl={apiBaseUrl}>{children}</LaunchpadProvider>
      </ToastProvider>
    </BluxProvider>
  );
}

function statusCheckMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'http') {
      if (error.status === 400) {
        return 'We could not verify your account. Sign out and sign in again.';
      }
      if (error.status === 403) {
        return 'This account has been deactivated. Contact support if you believe this is a mistake.';
      }
      if (error.status === 503) {
        return 'The registration service is unavailable right now. Try again in a moment.';
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

function avatarErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'http' && error.status === 413) {
      return photoTooLargeMessage(error);
    }
    if (error.code === 'http' && error.status === 400) {
      return error.serverMessage ?? 'Choose a valid photo file.';
    }
  }
  return 'We could not update your photo right now. Try again.';
}

const SESSION_EXPIRED_RESULT: AccountActionResult = {
  ok: false,
  error: 'Your account changed while the request was running. Try again.',
};

/** Terminal outcomes of the registration status check that login() awaits. */
type CheckOutcome = 'registered' | 'unregistered' | 'error' | 'cancelled';

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
  const [loginPhase, setLoginPhase] = useState<'connecting' | 'checking' | null>(
    null,
  );
  const notify = useNotify();
  const [account, setAccount] = useState<AccountState>({ status: 'signed-out' });
  const [statusNonce, setStatusNonce] = useState(0);
  const registerInFlight = useRef(false);
  // Latest account state for async continuations that read it after awaits.
  const accountRef = useRef(account);
  // A login() call awaiting the registration status check resolves through
  // this ref when the check settles.
  const statusWaiter = useRef<{
    resolve: (outcome: CheckOutcome) => void;
  } | null>(null);
  // Guards the gap between routing a new user to /register and the route
  // change taking effect, so the disconnect rule below never fires early.
  const registerRoutePending = useRef(false);
  // This module only loads in the browser (ssr: false boundary), so reading
  // the query string during the initial state pass is safe.
  const [isPreview] = useState(
    () =>
      process.env.NODE_ENV === 'development' &&
      new URLSearchParams(window.location.search).get('preview') === '1',
  );

  useEffect(() => {
    configureApi(apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (blux.user) hydrateBluxConnection(blux.user);
  }, [blux.user]);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  // Stable identity for the signed-in provider user; the SDK may hand out a
  // fresh user object on unrelated store updates, which must not re-run the
  // status check.
  const userIdentity = blux.user
    ? `${blux.user.authMethod}:${blux.user.authValue}:${blux.user.address}`
    : null;

  // Identifies the signed-in provider user against the LumenRise API and
  // resolves whether they still need to register. Until this settles, pages
  // must not guess either state. Signing out or switching users aborts the
  // in-flight check and discards its response. A login() call awaiting the
  // outcome is resolved first, so it can route before the new account state
  // renders anywhere.
  useEffect(() => {
    const settleWaiter = (outcome: CheckOutcome) => {
      const waiter = statusWaiter.current;
      statusWaiter.current = null;
      waiter?.resolve(outcome);
    };
    if (!blux.isAuthenticated || !userIdentity) {
      setApiUserId(null);
      setAccount(isPreview ? { status: 'preview' } : { status: 'signed-out' });
      settleWaiter('cancelled');
      return;
    }
    const userId = getAuthProviderUserId();
    if (!userId) {
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
    setAccount((current) =>
      current.status === 'registered' && current.profile.userId === userId
        ? current
        : { status: 'checking' },
    );
    getRegistrationStatus({ signal: controller.signal })
      .then((status) => {
        if (cancelled) return;
        settleWaiter(status.registered ? 'registered' : 'unregistered');
        if (status.registered) {
          setAccount({
            status: 'registered',
            profile: {
              userId: status.userId,
              identityId: status.identityId,
              name: status.name,
              avatarUrl: status.avatarUrl,
              addresses: [],
            },
          });
        } else {
          setAccount({ status: 'unregistered' });
        }
      })
      .catch((error) => {
        if (cancelled || isAbortError(error)) return;
        settleWaiter('error');
        setAccount({ status: 'error', message: statusCheckMessage(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
      settleWaiter('cancelled');
    };
    // userIdentity is the stable key for blux.user; statusNonce re-runs the
    // check on retry.
  }, [blux.isAuthenticated, userIdentity, isPreview, statusNonce]);

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
    if (isPreview) return;
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
  }, [account.status, pathname, isPreview, blux, notify]);

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
      if (!userId) {
        return {
          ok: false,
          error: 'Your session is not ready yet. Refresh the page and try again.',
        };
      }
      registerInFlight.current = true;
      try {
        const profile = await registerAccount({
          name: input.name,
          avatar: input.avatar ?? null,
        });
        if (getApiUserId() !== userId) return SESSION_EXPIRED_RESULT;
        setAccount({ status: 'registered', profile });
        return { ok: true };
      } catch (error) {
        if (getApiUserId() !== userId) return SESSION_EXPIRED_RESULT;
        if (
          error instanceof ApiError &&
          (error.code === 'timeout' || error.code === 'network')
        ) {
          // The request may still have reached the server. Never assume the
          // registration succeeded — confirm with a fresh status check.
          try {
            const status = await getRegistrationStatus();
            if (status.registered) {
              if (getApiUserId() !== userId) return SESSION_EXPIRED_RESULT;
              setAccount({
                status: 'registered',
                profile: {
                  userId: status.userId,
                  identityId: status.identityId,
                  name: status.name,
                  avatarUrl: status.avatarUrl,
                  addresses: [],
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
    [],
  );

  const updateAvatar = useCallback(
    async (file: File): Promise<AccountActionResult> => {
      const userId = getApiUserId();
      if (!userId) {
        return {
          ok: false,
          error: 'Your session is not ready yet. Refresh the page and try again.',
        };
      }
      try {
        await uploadAvatar(file);
        const fresh = await getProfile();
        if (getApiUserId() !== userId) return SESSION_EXPIRED_RESULT;
        setAccount((current) =>
          current.status === 'registered'
            ? { status: 'registered', profile: { ...current.profile, ...fresh } }
            : current,
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, error: avatarErrorMessage(error) };
      }
    },
    [],
  );

  const refreshProfile = useCallback(async (): Promise<void> => {
    const userId = getApiUserId();
    if (!userId) return;
    try {
      const fresh = await getProfile();
      if (getApiUserId() !== userId) return;
      setAccount((current) =>
        current.status === 'registered'
          ? { status: 'registered', profile: { ...current.profile, ...fresh } }
          : current,
      );
    } catch {
      // A background refresh failure keeps the last known profile; explicit
      // actions surface their own errors.
    }
  }, []);

  const removeAvatar = useCallback(async (): Promise<AccountActionResult> => {
    const userId = getApiUserId();
    if (!userId) {
      return {
        ok: false,
        error: 'Your session is not ready yet. Refresh the page and try again.',
      };
    }
    try {
      await deleteAvatar();
      if (getApiUserId() !== userId) return SESSION_EXPIRED_RESULT;
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
  }, []);

  const login = useCallback(
    async (destination?: string) => {
      if (blux.isAuthenticated && accountRef.current.status === 'registered') return;

      saveAuthReturnTo(destination);
      try {
        if (!blux.isAuthenticated) {
          const loginRequest = blux.login();
          setLoginPhase('connecting');
          const user = await loginRequest;
          hydrateBluxConnection(user);
        }

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

        if (outcome === 'registered') {
          // The registration page owns its redirect; consuming its target here
          // would race that effect. Other pages stay mounted after signing in.
          if (window.location.pathname !== '/register') consumeAuthReturnTo();
        } else if (outcome === 'unregistered') {
          if (pathname !== '/register') {
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
        const message =
          error instanceof Error
            ? error.message
            : 'Blux could not open the login flow.';
        notify(message.replace(/^BLUX:\s*/i, ''), { tone: 'error' });
      } finally {
        setLoginPhase(null);
      }
    },
    [blux, router, pathname, notify],
  );

  const logout = useCallback(() => {
    // Signing out is handled by the auth provider SDK; the API has no login
    // or logout endpoint of its own. Local account state resets so nothing
    // from the previous user leaks into the next session.
    blux.logout();
    setApiUserId(null);
    setAccount({ status: 'signed-out' });
    router.push('/');
    notify('You are now logged out.', { tone: 'success' });
  }, [blux, router, notify]);

  const accountReady =
    account.status === 'registered' || account.status === 'preview';
  const loginPending = loginPhase !== null;

  const value = useMemo<LaunchpadContextValue>(
    () => ({
      isSignedIn: blux.isAuthenticated || isPreview,
      address: blux.user?.address || (isPreview ? DEMO_ADDRESS : undefined),
      loginPending,
      loginPhase,
      login,
      logout,
      notify,
      account,
      accountReady,
      retryStatusCheck,
      register,
      refreshProfile,
      updateAvatar,
      removeAvatar,
    }),
    [
      blux.isAuthenticated,
      blux.user,
      isPreview,
      loginPending,
      loginPhase,
      login,
      logout,
      notify,
      account,
      accountReady,
      retryStatusCheck,
      register,
      refreshProfile,
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
