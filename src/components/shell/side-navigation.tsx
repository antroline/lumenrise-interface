'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
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
import { isActive, navGroups, type NavItem } from './navigation';
import { WalletButton } from './wallet-button';

const sideNavId = 'side-navigation';

const rowClass =
  'flex h-10 w-full items-center overflow-hidden rounded-lg text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none';

const fadeClass = 'transition-opacity duration-200 motion-reduce:transition-none';

const iconButtonClass = 'shrink-0 text-muted-foreground hover:text-foreground';

export function SideNavigation() {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div
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
      </div>

      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-page px-4 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className={iconButtonClass}
              >
                <Menu />
              </Button>
            }
          />
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[280px] gap-0 bg-sidebar p-0 text-sidebar-foreground duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarPanel
              onNavigate={() => setMobileOpen(false)}
              onSearch={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
              walletMenuSide="top"
              header={
                <>
                  <HomeLink onClick={() => setMobileOpen(false)} />
                  <SheetClose
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close navigation"
                        className={cn(iconButtonClass, 'ml-auto')}
                      >
                        <X className="size-[18px]" />
                      </Button>
                    }
                  />
                </>
              }
            />
          </SheetContent>
        </Sheet>
        <HomeLink height={26} />
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
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

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4">
        <RailItem
          label="Search"
          collapsed={collapsed}
          render={
            <button
              type="button"
              onClick={onSearch}
              aria-keyshortcuts="/ Control+K Meta+K"
              className={cn(rowClass, 'bg-sidebar-accent/60')}
            />
          }
        >
          <RowIcon icon={Search} />
          <span className={cn(fadeClass, collapsed && 'opacity-0')}>Search</span>
          <Kbd
            aria-hidden="true"
            className={cn('mr-2.5 ml-auto', fadeClass, collapsed && 'opacity-0')}
          >
            /
          </Kbd>
        </RailItem>

        <nav aria-label="Primary" className="mt-3 flex flex-col gap-2">
          {navGroups.map((group, index) => {
            const labelId = `${id}-group-${index}`;
            return (
              <div
                key={group.label}
                role="group"
                aria-labelledby={labelId}
                className="flex flex-col gap-0.5"
              >
                <div className="relative flex h-7 items-center overflow-hidden px-2.5">
                  <span
                    id={labelId}
                    className={cn(
                      'font-mono text-2xs font-medium tracking-[0.16em] whitespace-nowrap text-faint uppercase',
                      fadeClass,
                      collapsed && 'opacity-0',
                    )}
                  >
                    {group.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 top-1/2 h-px bg-sidebar-border opacity-0',
                      fadeClass,
                      collapsed && 'opacity-100',
                    )}
                  />
                </div>
                {group.items.map((item) => {
                  const active =
                    item.href === '/launches' ? false : isActive(pathname, item);
                  return (
                    <RailItem
                      key={item.href}
                      label={item.label}
                      collapsed={collapsed}
                      render={
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            rowClass,
                            active &&
                              'bg-sidebar-accent text-foreground hover:bg-sidebar-accent',
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
                            'mr-2.5 ml-auto font-mono text-caption text-faint',
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
          'flex shrink-0 gap-2 border-t border-sidebar-border p-3',
          collapsed ? 'flex-col' : 'items-center',
        )}
      >
        <ThemeToggle />
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
    <span className="grid size-10 shrink-0 place-items-center" aria-hidden="true">
      <Icon className="size-[18px]" />
    </span>
  );
}

function HomeLink({
  height = 28,
  onClick,
}: {
  height?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/"
      aria-label="LumenRise home"
      onClick={onClick}
      className="flex h-10 shrink-0 items-center rounded-lg px-1.5 focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none"
    >
      <LogoHorizontal height={height} variant="lime" className="max-w-none" />
    </Link>
  );
}
