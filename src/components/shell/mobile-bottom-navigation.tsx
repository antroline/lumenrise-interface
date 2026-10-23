'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { API_NETWORK } from '@/lib/stellar/network';
import { cn } from '@/lib/utils';
import { isActive, mobilePrimaryItems, navigationHref } from './navigation';

export function MobileBottomNavigation() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<BottomNavigationItems pathname={pathname} />}>
      <NetworkBottomNavigation pathname={pathname} />
    </Suspense>
  );
}

function NetworkBottomNavigation({ pathname }: { pathname: string }) {
  const params = useSearchParams();
  return <BottomNavigationItems pathname={pathname} network={params.get('network') ?? API_NETWORK} />;
}

function BottomNavigationItems({ pathname, network = API_NETWORK }: { pathname: string; network?: string | null }) {
  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto h-16 max-w-md rounded-[22px] border border-sidebar-border/70 bg-sidebar/80 px-2 shadow-[0_8px_28px_-10px_rgb(0_0_0/0.28)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-sidebar/65 lg:hidden dark:border-white/10 dark:shadow-[0_8px_28px_-10px_rgb(0_0_0/0.6)]"
    >
      <div className="grid h-full grid-cols-4 items-center gap-1">
        {mobilePrimaryItems.map(item => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={navigationHref(item.href, network)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                active && 'font-semibold text-foreground',
              )}
            >
              <span className={cn('grid h-7 w-11 place-items-center rounded-full', active && 'bg-primary text-primary-foreground')}>
                <item.icon aria-hidden="true" className="size-5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
