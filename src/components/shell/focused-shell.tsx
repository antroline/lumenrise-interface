'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { LogoHorizontal, LogoSymbol } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WalletButton } from './wallet-button';

/** A task-focused frame: brand, wallet and a way out, without the site navigation. */
export function FocusedShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-page">
      <header className="mx-auto flex h-16 w-full max-w-[88rem] items-center gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-5 lg:px-6">
        <Link
          href="/"
          aria-label="LumenRise home"
          className="flex h-10 shrink-0 items-center rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <span className="flex sm:hidden">
            <LogoSymbol size={28} />
          </span>
          <span className="hidden sm:flex">
            <LogoHorizontal height={24} variant="lime" className="max-w-none" />
          </span>
        </Link>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        <p className="min-w-0 truncate text-body font-medium">{title}</p>
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
      <main className="animate-settle relative z-10 mx-auto w-full max-w-[88rem] px-3 pb-6 sm:px-5 lg:px-6">
        {children}
      </main>
    </div>
  );
}
