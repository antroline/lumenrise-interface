'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  return <BottomNavigationItems pathname={pathname} network={params.get('network')} />;
}

function BottomNavigationItems({ pathname, network }: { pathname: string; network?: string | null }) {
  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-30 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-sidebar-border bg-sidebar px-4 pb-[env(safe-area-inset-bottom)] lg:hidden"
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
                'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                active && 'font-semibold text-foreground',
              )}
            >
              <span className={cn('grid h-7 w-11 place-items-center rounded-lg', active && 'bg-primary text-primary-foreground')}>
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
