'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { BluxProvider, networks, useBlux } from '@bluxcc/react';
import { hydrateBluxConnection } from '@/lib/connections';
import { LaunchpadContext, type LaunchpadContextValue } from '@/lib/launchpad';

const DEMO_ADDRESS = 'GDEMO6K4KQPR5H7NQOL6UPRTMPL4TE6CYXW2LP7SSQ3J2BQY7X2Q';

const bluxConfig: Parameters<typeof BluxProvider>[0]['config'] = {
  appId: process.env.NEXT_PUBLIC_BLUX_APP_ID || 'launchpad-preview',
  appName: 'Launchpad',
  networks: [networks.testnet],
  showWalletUIs: false,
  defaultNetwork: networks.testnet,
  loginMethods: ['wallet', 'email', 'passkey', 'twitter', 'github', 'gitlab'],
  appearance: {
    background: '#ffffff',
    fieldBackground: '#f7f7f5',
    accentColor: '#0b0b0b',
    textColor: '#0b0b0b',
    fontFamily: 'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
    borderRadius: '14px',
    borderColor: '#e5e5e5',
    borderWidth: '1px',
    outlineColor: '#0b0b0b',
    outlineWidth: '2px',
    outlineRadius: '14px',
    logo: `${window.location.origin}/branding/lumenrise-symbol-for-light-background.svg`,
    backdropBlur: '4px',
    backdropColor: 'rgba(11, 11, 11, 0.28)',
    boxShadow: '0 24px 70px rgba(11, 11, 11, 0.18)',
  },
};

export default function ClientApp({ children }: { children: ReactNode }) {
  return (
    <BluxProvider config={bluxConfig}>
      <LaunchpadProvider>{children}</LaunchpadProvider>
    </BluxProvider>
  );
}

function LaunchpadProvider({ children }: { children: ReactNode }) {
  const blux = useBlux();
  const router = useRouter();
  const [loginPending, setLoginPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // This module only loads in the browser (ssr: false boundary), so reading
  // the query string during the initial state pass is safe.
  const [isPreview] = useState(
    () =>
      process.env.NODE_ENV === 'development' &&
      new URLSearchParams(window.location.search).get('preview') === '1',
  );

  useEffect(() => {
    if (blux.user) hydrateBluxConnection(blux.user);
  }, [blux.user]);

  const login = useCallback(
    async (destination = '/portfolio') => {
      if (blux.isAuthenticated) {
        router.push(destination);
        return;
      }

      window.sessionStorage.setItem('launchpad:returnTo', destination);
      try {
        const loginRequest = blux.login();
        setLoginPending(true);
        const user = await loginRequest;
        hydrateBluxConnection(user);
        router.push('/onboarding');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Blux could not open the login flow.';
        setNotice(message.replace(/^BLUX:\s*/i, ''));
      } finally {
        setLoginPending(false);
      }
    },
    [blux, router],
  );

  const logout = useCallback(() => {
    blux.logout();
    router.push('/');
    setNotice('You are now logged out.');
  }, [blux, router]);

  const notify = useCallback((message: string) => setNotice(message), []);

  const value = useMemo<LaunchpadContextValue>(
    () => ({
      isSignedIn: blux.isAuthenticated || isPreview,
      address: blux.user?.address || (isPreview ? DEMO_ADDRESS : undefined),
      loginPending,
      login,
      logout,
      notify,
    }),
    [
      blux.isAuthenticated,
      blux.user,
      isPreview,
      loginPending,
      login,
      logout,
      notify,
    ],
  );

  return (
    <LaunchpadContext.Provider value={value}>
      <div className="min-h-screen">
        {children}
        {notice && (
          <div
            role="status"
            className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-3 font-mono text-[12px] text-white shadow-[0_18px_50px_rgba(11,11,11,0.35)] dark:bg-foreground dark:text-background"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
              className="cursor-pointer text-white/70 transition-colors hover:text-white dark:text-background/70 dark:hover:text-background"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </LaunchpadContext.Provider>
  );
}
