'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { LogoHorizontal } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NetworkWalletButton as WalletButton } from './network-wallet-button';
import { NetworkSwitcher } from './network-switcher';
import { useNetwork } from '@/lib/networks/context';
import { navigationHref } from './navigation';
import { SideNavigation } from './side-navigation';

/** A focused toolbar, with the shared mobile navigation above it. */
export function FocusedShell({ title, children }: { title: string; children: ReactNode }) {
  const { activeNetwork } = useNetwork();
  return (
    <div className="relative isolate min-h-svh bg-card lg:bg-page">
      <SideNavigation mobileOnly />
      <header className="border-b border-divider bg-card lg:border-0 lg:bg-transparent">
        <div className="mx-auto flex h-14 w-full max-w-[88rem] items-center gap-3 px-4 sm:px-5 lg:h-16 lg:gap-5 lg:px-6">
          <Link
            href={navigationHref('/', activeNetwork.id)}
            aria-label="LumenRise home"
            className="hidden h-11 shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
          >
            <LogoHorizontal height={28} className="max-w-none" />
          </Link>
          <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-divider lg:block" />
          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">{title}</p>
          <div className="ml-auto flex shrink-0 items-center gap-2 [&>button]:h-11 [&>div>button]:h-11">
            <NetworkSwitcher className="hidden h-11 w-auto rounded-lg border border-border bg-card hover:bg-secondary lg:flex" />
            <div className="[&>button]:size-11 [&>button]:rounded-lg [&>button]:border [&>button]:border-border [&>button]:bg-card [&>button]:hover:bg-secondary">
              <ThemeToggle />
            </div>
            <WalletButton showNetwork={false} className="hidden h-11 max-w-52 rounded-lg border border-border bg-card px-3 hover:bg-secondary sm:inline-flex" />
            <WalletButton compact showNetwork={false} className="size-11 rounded-lg border border-border bg-card hover:bg-secondary sm:hidden" />
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-divider sm:block" />
            <Link
              href={navigationHref('/', activeNetwork.id)}
              aria-label={`Exit ${title.toLowerCase()}`}
              title="Exit"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground')}
            >
              <X aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
      <main className="animate-settle relative z-10 mx-auto w-full max-w-[88rem] lg:px-6 lg:pb-6">
        {children}
      </main>
    </div>
  );
}
