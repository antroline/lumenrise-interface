'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './shell/breadcrumbs';
import { FocusedShell } from './shell/focused-shell';
import { SideNavigation } from './shell/side-navigation';
import { MobileBottomNavigation } from './shell/mobile-bottom-navigation';
import { useNetwork } from '@/lib/networks/context';
import { BaseUnavailable } from '@/features/base/components/base-unavailable';
import { NetworkMismatch } from './network-mismatch';

/** Routes that render as a focused flow without the site navigation. */
const bareRoutes = new Set(['/onboarding', '/register']);

/** Routes that use the full viewport width instead of the centred reading column. */
function isFullWidth(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/projects' ||
    /^\/(?:projects|launch(?:es)?)\/[^/]+$/.test(pathname)
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeNetwork, requestedNetworkId } = useNetwork();
  const isBase = activeNetwork.blockchain === 'base';
  const isLaunchDetails = /^\/(?:projects|launch(?:es)?)\/[^/]+$/.test(pathname);

  if (bareRoutes.has(pathname) || (process.env.NODE_ENV === 'development' && pathname === '/design-lab')) return children;
  if (pathname === '/create') return <FocusedShell title="Create a launch">{children}</FocusedShell>;
  const stellarOnly = isBase && /^\/(?:missions|developers|cli|polic(?:y|ies))(?:\/|$)/.test(pathname);

  return (
    <div className={cn('relative isolate min-h-svh bg-page pb-[calc(5.5rem+max(0.75rem,env(safe-area-inset-bottom)))] lg:flex lg:pb-0', pathname === '/projects' && 'bg-muted dark:bg-page', isLaunchDetails && 'dark:bg-page')}>
      <SideNavigation />

      <div className={cn('min-w-0 flex-1', isLaunchDetails && 'dark:bg-card')}>
        <main
          className={cn(
            'animate-settle relative z-10 mx-auto w-full px-4 pt-6 pb-16 sm:pt-8 lg:pt-10 lg:pb-[72px]',
            isFullWidth(pathname)
              ? 'sm:px-5 lg:px-6'
              : 'max-w-[1200px] sm:px-6 lg:px-10',
            isLaunchDetails && 'max-sm:px-0',
          )}
        >
          {!isBase && !requestedNetworkId && <Breadcrumbs />}
          {requestedNetworkId ? <NetworkMismatch /> : stellarOnly ? <BaseUnavailable /> : children}
        </main>
      </div>
      <MobileBottomNavigation />
    </div>
  );
}
