'use client';

import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Icon, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { LogoHorizontal, LogoSymbol } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GlobalSearchDialog } from './global-search';
import { API_NETWORK } from '@/lib/stellar/network';
import { isActive, mobileDrawerItems, mobilePrimaryItems, navigationHref, navGroups, type NavItem } from './navigation';
import { WalletButton } from './wallet-button';

const sideNavId = 'side-navigation';

const rowClass =
  'relative flex h-10 w-full items-center overflow-hidden rounded-lg text-sm font-medium whitespace-nowrap text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-inset focus-visible:outline-none motion-reduce:transition-none dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-500';

const fadeClass = 'transition-opacity duration-200 motion-reduce:transition-none';

const iconButtonClass = 'shrink-0 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-500';

export function SideNavigation({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)');
    const closeMobileDrawer = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', closeMobileDrawer);
    return () => desktop.removeEventListener('change', closeMobileDrawer);
  }, []);

  return (
    <>
      {!mobileOnly && <div
        id={sideNavId}
        className={cn(
          'sticky top-0 z-30 hidden h-svh shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:block',
          expanded ? 'w-62' : 'w-16',
        )}
      >
        <SidebarPanel
          collapsed={!expanded}
          onSearch={() => setSearchOpen(true)}
          walletMenuSide="right"
          header={
            <>
              {expanded && <HomeLink />}
              <RailItem
                label="Expand navigation"
                collapsed={!expanded}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpanded((current) => !current)}
                    aria-label={
                      expanded ? 'Collapse navigation' : 'Expand navigation'
                    }
                    aria-expanded={expanded}
                    aria-controls={sideNavId}
                    className={cn(iconButtonClass, 'group/toggle relative ml-auto')}
                  />
                }
              >
                {expanded ? (
                  <PanelLeftClose className="size-[18px]" />
                ) : (
                  <>
                    <span className="grid place-items-center transition-opacity duration-150 group-hover/toggle:opacity-0 group-focus-visible/toggle:opacity-0">
                      <LogoSymbol size={24} />
                    </span>
                    <PanelLeftOpen className="absolute size-[18px] opacity-0 transition-opacity duration-150 group-hover/toggle:opacity-100 group-focus-visible/toggle:opacity-100" />
                  </>
                )}
              </RailItem>
            </>
          }
        />
      </div>}

      <div className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                  className={cn(iconButtonClass, 'size-11 justify-self-start')}
                >
                  <Icon
                    iconNode={[['path', { d: 'M5 8h14M5 16h8', key: 'menu-lines' }]]}
                    aria-hidden="true"
                    className="size-5"
                  />
                </Button>
              }
            />
            <SheetContent
              side="left"
              showCloseButton={false}
              className="data-[side=left]:h-dvh data-[side=left]:w-dvw data-[side=left]:max-w-none data-[side=left]:sm:max-w-none gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileDrawerContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <HomeLink height={32} className="h-11 justify-self-center px-0" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            aria-keyshortcuts="/ Control+K Meta+K"
            onClick={() => setSearchOpen(true)}
            className={cn(iconButtonClass, 'size-11 justify-self-end')}
          >
            <Search className="size-5" />
          </Button>
        </div>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MobileDrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const network = useSearchParams().get('network') ?? API_NETWORK;
  const primary = mobileDrawerItems.filter(item => mobilePrimaryItems.some(tab => tab.href === item.href));
  const secondary = mobileDrawerItems.filter(item => !mobilePrimaryItems.some(tab => tab.href === item.href));

  return (
    <div className="flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-5 sm:px-8">
        <HomeLink height={30} onClick={onNavigate} className="h-11 px-0" />
        <SheetClose render={
          <Button variant="secondary" size="icon" aria-label="Close navigation" className="size-11 rounded-xl">
            <X className="size-5" />
          </Button>
        } />
      </div>
      <nav aria-label="More navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          {primary.map(item => {
            const active = isActive(pathname, item);
            const create = item.href === '/create';
            return (
              <Link
                key={item.href}
                href={navigationHref(item.href, network)}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex min-h-16 items-center gap-4 rounded-xl px-4 py-3 text-xl font-medium tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                  create
                    ? 'bg-primary text-primary-foreground hover:bg-lime-hover'
                    : 'text-foreground hover:bg-secondary',
                  active && !create && 'bg-secondary',
                )}
              >
                <item.icon aria-hidden="true" className="size-6 shrink-0" />
                <span className="min-w-0 flex-1">{item.label}</span>
                <ArrowRight aria-hidden="true" className={cn('size-5 shrink-0', !create && !active && 'text-muted-foreground')} />
              </Link>
            );
          })}
          <div className="mt-4 flex flex-col gap-1 border-t border-sidebar-border pt-4">
            {secondary.map(item => (
              <Link
                key={item.href}
                href={navigationHref(item.href, API_NETWORK)}
                onClick={onNavigate}
                aria-current={isActive(pathname, item) ? 'page' : undefined}
                className="flex min-h-12 items-center gap-4 rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-secondary aria-[current=page]:text-foreground motion-reduce:transition-none"
              >
                <item.icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.href.startsWith('https:') && <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />}
              </Link>
            ))}
            <ThemeToggle showLabel />
          </div>
        </div>
      </nav>
      <div className="shrink-0 border-t border-sidebar-border px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 [&>button]:min-h-11 [&>button]:min-w-11">
          <WalletButton menuSide="top" onNavigate={onNavigate} className="min-w-0 flex-1" />
        </div>
      </div>
    </div>
  );
}

function SidebarPanel({
  collapsed = false,
  header,
  onNavigate,
  onSearch,
  walletMenuSide,
}: {
  collapsed?: boolean;
  header: ReactNode;
  onNavigate?: () => void;
  onSearch: () => void;
  walletMenuSide: 'top' | 'right';
}) {
  const pathname = usePathname();
  const id = useId();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-3">{header}</div>

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-4">
        <RailItem
          label="Search"
          collapsed={collapsed}
          render={
            <button
              type="button"
              onClick={onSearch}
              aria-keyshortcuts="/ Control+K Meta+K"
              className={cn(rowClass, 'shrink-0 bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700')}
            />
          }
        >
          <RowIcon icon={Search} />
          <span className={cn(fadeClass, collapsed && 'opacity-0')}>Search</span>
          <Kbd
            aria-hidden="true"
            className={cn('mr-2.5 ml-auto border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400', fadeClass, collapsed && 'opacity-0')}
          >
            /
          </Kbd>
        </RailItem>

        <nav aria-label="Primary" className="mt-3 flex flex-1 flex-col gap-3">
          {navGroups.map((group, index) => {
            const labelId = `${id}-group-${index}`;
            return (
              <div
                key={group.label}
                role="group"
                aria-labelledby={labelId}
                className={cn('flex shrink-0 flex-col gap-0.5', group.label === 'Account' && 'mt-auto pt-3')}
              >
                <div className="relative flex h-6 items-center overflow-hidden px-2.5">
                  <span
                    id={labelId}
                    className={cn(
                      'text-2xs font-medium tracking-[0.14em] whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400',
                      fadeClass,
                      collapsed && 'opacity-0',
                    )}
                  >
                    {group.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 top-1/2 h-px bg-neutral-200 opacity-0 dark:bg-neutral-800',
                      fadeClass,
                      collapsed && 'opacity-100',
                    )}
                  />
                </div>
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <RailItem
                      key={item.href}
                      label={item.label}
                      collapsed={collapsed}
                      render={
                        <Link
                          href={navigationHref(item.href, API_NETWORK)}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            rowClass,
                            active &&
                              'bg-sidebar-accent font-semibold text-sidebar-foreground before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-lime hover:bg-sidebar-accent',
                          )}
                        />
                      }
                    >
                      <RowIcon icon={item.icon} />
                      <span className={cn(fadeClass, collapsed && 'opacity-0')}>
                        {item.label}
                      </span>
                      {item.count && (
                        <span
                          className={cn(
                            'mr-2.5 ml-auto font-mono text-caption text-neutral-500 dark:text-neutral-400',
                            fadeClass,
                            collapsed && 'opacity-0',
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </RailItem>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          'flex shrink-0 gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800',
          collapsed ? 'flex-col' : 'items-center',
        )}
      >
        <div className="shrink-0 [&>button]:text-neutral-500 [&>button]:hover:bg-neutral-100 [&>button]:hover:text-neutral-900 [&>button]:focus-visible:ring-neutral-400 dark:[&>button]:text-neutral-400 dark:[&>button]:hover:bg-neutral-800 dark:[&>button]:hover:text-neutral-100 dark:[&>button]:focus-visible:ring-neutral-500">
          <ThemeToggle />
        </div>
        <WalletButton
          compact={collapsed}
          menuSide={walletMenuSide}
          className={collapsed ? undefined : 'min-w-0 flex-1'}
        />
      </div>
    </div>
  );
}

/** Shows its label as a tooltip only while the sidebar is collapsed to icons. */
function RailItem({
  label,
  collapsed,
  render,
  children,
}: {
  label: string;
  collapsed: boolean;
  render: ComponentProps<typeof TooltipTrigger>['render'];
  children: ReactNode;
}) {
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={render}>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function RowIcon({ icon: Icon }: { icon: NavItem['icon'] }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center text-neutral-500 dark:text-neutral-400" aria-hidden="true">
      <Icon className="size-[18px]" />
    </span>
  );
}

function HomeLink({
  height = 28,
  onClick,
  className,
}: {
  height?: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={navigationHref('/', API_NETWORK)}
      aria-label="LumenRise home"
      onClick={onClick}
      className={cn('flex h-10 shrink-0 items-center rounded-lg px-1.5 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none dark:focus-visible:ring-neutral-500', className)}
    >
      <LogoHorizontal height={height} variant="lime" className="max-w-none" />
    </Link>
  );
}
