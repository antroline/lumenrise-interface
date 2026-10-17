'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './shell/breadcrumbs';
import { SideNavigation } from './shell/side-navigation';

// Top header — commented out while the side navigation is tested.
// To restore it, uncomment this block, the state/effect in AppShell and the
// <header> JSX below, then remove <SideNavigation /> and its wrapper.
//
// import { useEffect, useState, type ReactNode } from 'react';
// import Link from 'next/link';
// import { Menu } from 'lucide-react';
// import { LogoHorizontal } from '@/components/logo';
// import { ThemeToggle } from '@/components/theme-toggle';
// import { Button } from '@/components/ui/button';
// import {
//   Sheet,
//   SheetContent,
//   SheetTitle,
//   SheetTrigger,
// } from '@/components/ui/sheet';
// import { HeaderNavigation, MobileNavigation } from './shell/navigation-menu';
// import { GlobalSearch } from './shell/global-search';
// import { WalletButton } from './shell/wallet-button';

/** Routes that render as a focused flow without the site navigation. */
const bareRoutes = new Set(['/onboarding', '/register']);

/** Routes that use the full viewport width instead of the centred reading column. */
function isFullWidth(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/launches' ||
    /^\/launch\/[^/]+$/.test(pathname)
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  // const [navOpen, setNavOpen] = useState(false);
  // const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // useEffect(() => {
  //   const updateHeader = () => setScrolled(window.scrollY > 0);
  //   updateHeader();
  //   window.addEventListener('scroll', updateHeader, { passive: true });
  //   return () => window.removeEventListener('scroll', updateHeader);
  // }, []);

  if (bareRoutes.has(pathname) || (process.env.NODE_ENV === 'development' && pathname === '/design-lab')) return children;

  return (
    <div className="relative isolate min-h-screen bg-page lg:flex">
      <SideNavigation />

      {/*
      <header
        className={cn(
          'sticky top-0 z-30 transition-colors duration-200',
          scrolled && 'bg-page/95 backdrop-blur-sm',
        )}
      >
        <div className="flex h-[68px] w-full items-center gap-2 px-4 sm:gap-3 sm:px-5 lg:px-6">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              }
            />
            <SheetContent
              side="left"
              className="w-[280px] p-0 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileNavigation onNavigate={() => setNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            aria-label="LumenRise home"
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-1 text-[19px] font-bold tracking-[-0.03em] focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none"
          >
            <span className="block w-[30px] overflow-hidden sm:w-auto">
              <LogoHorizontal
                height={30}
                variant="lime"
                className="max-w-none"
              />
            </span>
          </Link>
          <HeaderNavigation />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <GlobalSearch />
            <div className="hidden xl:block">
              <ThemeToggle />
            </div>
            <WalletButton />
          </div>
        </div>
      </header>
      */}

      <div className="page-dot-background min-w-0 flex-1">
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
    </div>
  );
}
