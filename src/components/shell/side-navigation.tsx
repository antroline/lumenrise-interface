'use client';

import {
  useEffect,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Icon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import { LogoHorizontal } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
// import { Kbd } from '@/components/ui/kbd';
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
import { LaunchpadContext } from '@/lib/launchpad';
import { GlobalSearchDialog } from './global-search';
import { useNetwork } from '@/lib/networks/context';
import {
  isActive,
  mobileDrawerItems,
  mobilePrimaryItems,
  navigationHref,
  navGroups,
  settingsItem,
  type NavItem,
} from './navigation';
import { NetworkWalletButton as WalletButton } from './network-wallet-button';
import { NetworkSwitcher } from './network-switcher';

const sideNavId = 'side-navigation';

const rowClass =
  'group/nav relative flex h-11 w-full items-center overflow-hidden rounded-xl pr-3 text-[15px] font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset focus-visible:outline-none motion-reduce:transition-none';

const fadeClass =
  'transition-opacity duration-200 motion-reduce:transition-none';

const iconButtonClass =
  'shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-sidebar-ring dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground dark:focus-visible:ring-ring';

const footerGroupClass =
  'flex flex-col gap-1 rounded-2xl border border-sidebar-border bg-secondary p-1 dark:border-transparent dark:bg-card [&_button]:h-11 [&_button]:w-full [&_button]:gap-3 [&_button]:rounded-xl [&_button]:border-transparent [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-sm [&_button]:font-medium [&_button]:text-foreground [&_button]:hover:bg-muted [&_button]:aria-expanded:bg-muted [&_button>svg]:size-5';

const footerWalletClass =
  'min-w-0 border-sidebar-border! dark:border-transparent! bg-background! dark:bg-secondary! font-semibold! hover:bg-muted! aria-expanded:bg-muted! focus-visible:ring-sidebar-ring [&>.lucide-chevron-down]:ml-auto';

export function SideNavigation({
  mobileOnly = false,
}: {
  mobileOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchAfterDrawerClose = useRef(false);

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
      {!mobileOnly && (
        <div
          id={sideNavId}
          className={cn(
            'sticky top-0 z-30 hidden h-svh shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:block',
            expanded ? 'w-70' : 'w-16',
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
                      className={cn(
                        iconButtonClass,
                        'ml-auto',
                      )}
                    />
                  }
                >
                  {expanded ? (
                    <PanelLeftClose className="size-[18px]" />
                  ) : (
                    <PanelLeftOpen className="size-[18px]" />
                  )}
                </RailItem>
              </>
            }
          />
        </div>
      )}

      <div className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar pr-3 pl-1 pt-[env(safe-area-inset-top)] sm:px-4 lg:hidden">
        <div className="flex h-14 items-center gap-1.5 sm:gap-2">
          <Sheet
            open={mobileOpen}
            onOpenChange={(open) => {
              if (open) searchAfterDrawerClose.current = false;
              setMobileOpen(open);
            }}
            onOpenChangeComplete={(open) => {
              if (!open && searchAfterDrawerClose.current) {
                setSearchOpen(true);
              }
            }}
          >
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                  className={cn(iconButtonClass, 'size-11 justify-self-start')}
                >
                  <Icon
                    iconNode={[
                      ['path', { d: 'M5 8h14M5 16h8', key: 'menu-lines' }],
                    ]}
                    aria-hidden="true"
                    className="size-5"
                  />
                </Button>
              }
            />
            <SheetContent
              side="left"
              showCloseButton={false}
              finalFocus={() => !searchAfterDrawerClose.current}
              className="data-[side=left]:h-dvh data-[side=left]:w-dvw data-[side=left]:max-w-none data-[side=left]:sm:max-w-none gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileDrawerContent
                onNavigate={() => setMobileOpen(false)}
                onSearch={() => {
                  searchAfterDrawerClose.current = true;
                  setMobileOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
          <HomeLink height={26} className="h-11 shrink-0 px-0 sm:hidden" />
          <HomeLink height={28} className="hidden h-11 shrink-0 px-0 sm:flex" />
          <NetworkSwitcher mobileHeader className="ml-auto shrink-0" />
        </div>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MobileDrawerContent({ onNavigate, onSearch }: { onNavigate: () => void; onSearch: () => void }) {
  const isSignedIn = useContext(LaunchpadContext)?.isSignedIn ?? false;
  const pathname = usePathname();
  const { activeNetwork } = useNetwork();
  const network = activeNetwork.id;
  const primary = mobileDrawerItems.filter((item) =>
    mobilePrimaryItems.some((tab) => tab.href === item.href),
  );
  const secondary = mobileDrawerItems.filter(
    (item) =>
      (isSignedIn || item.href !== settingsItem.href) &&
      !mobilePrimaryItems.some((tab) => tab.href === item.href),
  );

  return (
    <div className="flex h-full min-h-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-24 shrink-0 items-center justify-between gap-3 px-5 sm:px-8">
        <HomeLink height={34} onClick={onNavigate} className="h-11 px-0" />
        <SheetClose
          render={
            <Button
              variant="secondary"
              size="icon"
              aria-label="Close navigation"
              className="size-11 rounded-xl"
            >
              <X className="size-5" />
            </Button>
          }
        />
      </div>
      <nav
        aria-label="More navigation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 sm:px-6"
      >
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="mb-2 flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <Search aria-hidden="true" className="size-5 shrink-0" />
            <span>Search</span>
          </button>
          {primary.map((item) => {
            const active = isActive(pathname, item);
            const create = item.href === '/create';
            return (
              <Link
                key={item.href}
                href={navigationHref(item.href, network)}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex min-h-12 items-center gap-4 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                  active ? 'bg-sidebar-accent font-semibold text-sidebar-foreground' : 'text-muted-foreground',
                  create && 'mt-3 font-semibold text-foreground',
                )}
              >
                <item.icon aria-hidden="true" className={cn('size-5 shrink-0', active && 'text-sidebar-primary')} />
                <span className="min-w-0 flex-1">{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-auto flex flex-col gap-1 pt-6">
            {secondary.map((item) => (
              <Link
                key={item.href}
                href={navigationHref(item.href, network)}
                onClick={onNavigate}
                aria-current={isActive(pathname, item) ? 'page' : undefined}
                className="flex min-h-11 items-center gap-4 rounded-xl px-4 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-secondary aria-[current=page]:text-foreground motion-reduce:transition-none"
              >
                <item.icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.href.startsWith('https:') && (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="shrink-0 px-3 pb-5 sm:px-6">
        <div className={cn(footerGroupClass, 'mx-auto w-full max-w-lg')}>
          <NetworkSwitcher />
          <ThemeToggle showLabel />
          <WalletButton
            menuSide="top"
            onNavigate={onNavigate}
            showNetwork={false}
            className={cn(footerWalletClass, 'mt-1 justify-start')}
          />
        </div>
      </div>
    </div>
  );
}

function SidebarPanel({
  collapsed = false,
  header,
  onNavigate,
  // onSearch,
  walletMenuSide,
}: {
  collapsed?: boolean;
  header: ReactNode;
  onNavigate?: () => void;
  onSearch: () => void;
  walletMenuSide: 'top' | 'right';
}) {
  const pathname = usePathname();
  const isSignedIn = useContext(LaunchpadContext)?.isSignedIn ?? false;
  const { activeNetwork } = useNetwork();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex h-24 shrink-0 items-center gap-2', collapsed ? 'px-3' : 'px-5')}>{header}</div>

      <div className={cn('flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-4', collapsed ? 'px-2' : 'px-3')}>
        {/* Search trigger temporarily hidden.
        <RailItem
          label="Search"
          collapsed={collapsed}
          render={
            <button
              type="button"
              onClick={onSearch}
              aria-haspopup="dialog"
              aria-keyshortcuts="/ Control+K Meta+K"
              className={cn(
                rowClass,
                'shrink-0 bg-secondary hover:bg-muted',
              )}
            />
          }
        >
          <RowIcon icon={Search} />
          <span className={cn(fadeClass, collapsed && 'opacity-0')}>
            Search
          </span>
          <Kbd
            aria-hidden="true"
            className={cn(
              'mr-2.5 ml-auto border-border text-muted-foreground dark:border-border dark:text-muted-foreground',
              fadeClass,
              collapsed && 'opacity-0',
            )}
          >
            /
          </Kbd>
        </RailItem>
        */}

        <nav aria-label="Primary" className="mt-4 flex flex-1 flex-col gap-3">
          {navGroups.map((group) => (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className={cn(
                'flex shrink-0 flex-col gap-1',
                group.label === 'For projects' && 'mt-3',
                group.label === 'Account' && 'mt-auto pt-6',
              )}
            >
              {group.items
                .filter((item) => isSignedIn || item.href !== settingsItem.href)
                .map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <RailItem
                      key={item.href}
                      label={item.label}
                      collapsed={collapsed}
                      render={
                        <Link
                          href={navigationHref(item.href, activeNetwork.id)}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            rowClass,
                            item.href === '/create' && 'font-semibold text-foreground',
                            active &&
                              'bg-sidebar-accent font-semibold text-sidebar-foreground',
                          )}
                        />
                      }
                    >
                      <RowIcon icon={item.icon} />
                      <span className={cn(fadeClass, collapsed && 'opacity-0')}>
                        {item.label}
                      </span>
                      {item.href.startsWith('https:') && (
                        <ArrowUpRight
                          aria-hidden="true"
                          className={cn(
                            'mr-2.5 ml-auto size-3.5 shrink-0',
                            fadeClass,
                            collapsed && 'opacity-0',
                          )}
                        />
                      )}
                      {item.count && (
                        <span
                          className={cn(
                            'mr-2.5 ml-auto font-mono text-caption text-muted-foreground dark:text-muted-foreground',
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
          ))}
        </nav>
      </div>

      <div className={cn('shrink-0 pb-5', collapsed ? 'px-1' : 'px-3')}>
        <div className={cn(
          footerGroupClass,
          collapsed && '[&_button]:justify-center [&_button]:px-0',
        )}>
          <NetworkSwitcher compact={collapsed} className={cn('focus-visible:ring-sidebar-ring dark:focus-visible:ring-ring/60', collapsed && 'pb-3')} />
          <ThemeToggle showLabel={!collapsed} />
          <WalletButton
            compact={collapsed}
            showNetwork={false}
            menuSide={walletMenuSide}
            onNavigate={onNavigate}
            className={cn(footerWalletClass, 'mt-1', !collapsed && 'justify-start')}
          />
        </div>
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
    <span
      className="grid h-11 w-12 shrink-0 place-items-center group-aria-[current=page]/nav:text-sidebar-primary"
      aria-hidden="true"
    >
      <Icon className="size-5" strokeWidth={1.6} />
    </span>
  );
}

function HomeLink({
  height = 32,
  onClick,
  className,
}: {
  height?: number;
  onClick?: () => void;
  className?: string;
}) {
  const { activeNetwork } = useNetwork();
  return (
    <Link
      href={navigationHref('/', activeNetwork.id)}
      aria-label="LumenRise home"
      onClick={onClick}
      className={cn(
        'flex h-10 shrink-0 items-center rounded-lg px-1.5 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none dark:focus-visible:ring-ring',
        className,
      )}
    >
      <LogoHorizontal height={height} variant="lime" className="max-w-none" />
    </Link>
  );
}
