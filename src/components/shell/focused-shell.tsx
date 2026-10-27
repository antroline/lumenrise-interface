'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { LogoHorizontal, LogoSymbol } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WalletButton } from './wallet-button';
import { SideNavigation } from './side-navigation';

/** A task-focused desktop frame with the shared site header on mobile. */
export function FocusedShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative isolate min-h-[calc(100svh-var(--network-banner-height,0px))] bg-card lg:bg-page">
      <SideNavigation mobileOnly />
      <header className="mx-auto hidden h-16 w-full max-w-[88rem] items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:gap-5 sm:px-5 lg:flex lg:px-6">
        <Link
          href="/"
          aria-label="LumenRise home"
          className="flex h-11 shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <span className="flex sm:hidden">
            <LogoSymbol size={32} />
          </span>
          <span className="hidden sm:flex">
            <LogoHorizontal height={28} className="max-w-none" />
          </span>
        </Link>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-foreground/15" />
        <p className="min-w-0 truncate text-sm font-medium tracking-tight text-muted-foreground sm:text-base">{title}</p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <WalletButton className="hidden sm:inline-flex" />
          <WalletButton compact className="sm:hidden" />
          <Link
            href="/"
            aria-label={`Exit ${title.toLowerCase()}`}
            title="Exit"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full text-muted-foreground hover:text-foreground')}
          >
            <X aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main className="animate-settle relative z-10 mx-auto w-full max-w-[88rem] lg:px-6 lg:pb-6">
        {children}
      </main>
    </div>
  );
}
