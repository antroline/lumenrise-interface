'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './shell/breadcrumbs';
import { SideNavigation } from './shell/side-navigation';
import { MobileBottomNavigation } from './shell/mobile-bottom-navigation';

/** Routes that render as a focused flow without the site navigation. */
const bareRoutes = new Set(['/onboarding', '/register']);

/** Routes that use the full viewport width instead of the centred reading column. */
function isFullWidth(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/launches' ||
    pathname === '/create' ||
    /^\/launch\/[^/]+$/.test(pathname)
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLaunchDetails = /^\/launch\/[^/]+$/.test(pathname);

  if (bareRoutes.has(pathname) || (process.env.NODE_ENV === 'development' && pathname === '/design-lab')) return children;

  return (
    <div className={cn('relative isolate min-h-screen bg-page pb-[calc(4rem+env(safe-area-inset-bottom))] lg:flex lg:pb-0', pathname === '/launches' && 'bg-neutral-100 dark:bg-page', isLaunchDetails && 'dark:bg-black')}>
      <SideNavigation />

      <div className={cn('min-w-0 flex-1', isLaunchDetails && 'dark:bg-neutral-950')}>
        <main
          className={cn(
            'animate-settle relative z-10 mx-auto w-full px-4 pt-6 pb-16 sm:pt-8 lg:pt-10 lg:pb-[72px]',
            isFullWidth(pathname)
              ? 'sm:px-5 lg:px-6'
              : 'max-w-[1200px] sm:px-6 lg:px-10',
            pathname === '/create' && 'pb-4 sm:pt-6 lg:pt-8 lg:pb-4 short:pt-4 short:sm:pt-4 short:lg:pt-5',
          )}
        >
          <Breadcrumbs />
          {children}
        </main>
      </div>
      <MobileBottomNavigation />
    </div>
  );
}
