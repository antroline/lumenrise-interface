'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { LogoHorizontal } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  discoverItem,
  explorerItem,
  missionsItem,
  portfolioItem,
  projectBrowseItems,
  projectItems,
  reputationItem,
  reputationMenuItems,
  navGroups,
  isActive,
  type HeaderNavItem,
} from './navigation';

export function MobileNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-7 overflow-y-auto px-5 pt-6 pb-6">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.03em]"
      >
        <LogoHorizontal height={30} variant="lime" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <h2 className="px-2.5 pb-2 font-mono text-2xs font-medium tracking-[0.16em] text-faint uppercase">
              {group.label}
            </h2>
            {group.items.map((item) => {
              const active =
                item.href === '/launches' ? false : isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-[11px] rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none',
                    active && 'bg-secondary text-foreground hover:bg-secondary',
                  )}
                >
                  <item.icon
                    className="size-[18px] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {item.count && (
                    <span
                      className="ml-auto font-mono text-caption text-faint"
                      aria-label={`${item.count} available`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between rounded-lg px-2.5 text-sm text-muted-foreground">
        <span>Appearance</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

const headerNavItem =
  'inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none xl:px-3 xl:text-base';

function HeaderDropdown({
  label,
  href,
  items,
  active,
  pathname,
}: {
  label: string;
  href?: string;
  items: HeaderNavItem[];
  active: boolean;
  pathname: string;
}) {
  const value = label.toLowerCase().replaceAll(' ', '-');

  return (
    <NavigationMenu.Item value={value}>
      <NavigationMenu.Trigger
        render={href ? <Link href={href} /> : undefined}
        nativeButton={!href}
        role={href ? 'link' : undefined}
        aria-current={href && pathname === href ? 'page' : undefined}
        className={cn(
          headerNavItem,
          'data-popup-open:bg-muted data-popup-open:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
      </NavigationMenu.Trigger>
      <NavigationMenu.Content
        id={`header-${value}-menu`}
        aria-label={`${label} links`}
        className="w-88 max-w-(--available-width) p-1.5"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <NavigationMenu.Link
                render={<Link href={item.href} />}
                active={
                  !item.href.startsWith('/launches') && isActive(pathname, item)
                }
                closeOnClick
                className="group/item flex items-center gap-3 rounded-lg p-2.5 text-popover-foreground transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset focus-visible:outline-none aria-[current=page]:bg-muted"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground transition-colors duration-150 group-hover/item:bg-emphasis group-hover/item:text-emphasis-mark group-focus-visible/item:bg-emphasis group-focus-visible/item:text-emphasis-mark group-aria-[current=page]/item:bg-emphasis group-aria-[current=page]/item:text-emphasis-mark"
                  aria-hidden="true"
                >
                  <item.icon className="size-4.5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm leading-tight font-medium">
                    {item.label}
                  </span>
                  <span className="text-small leading-snug text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}

export function HeaderNavigation() {
  const pathname = usePathname();
  const projectsActive =
    pathname === '/launches' ||
    projectBrowseItems.some((item) =>
      item.match?.some((prefix) => pathname.startsWith(`${prefix}/`)),
    );
  const forProjectsActive = projectItems.some((item) =>
    isActive(pathname, item),
  );
  const reputationActive =
    isActive(pathname, reputationItem) || isActive(pathname, explorerItem);

  return (
    <NavigationMenu.Root
      key={pathname}
      aria-label="Primary"
      closeDelay={150}
      data-slot="header-navigation"
      className="hidden lg:block"
    >
      <NavigationMenu.List className="flex items-center gap-0.5 xl:gap-1">
        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link href={discoverItem.href} />}
            active={pathname === '/'}
            closeOnClick
            className={cn(headerNavItem, pathname === '/' && 'text-foreground')}
          >
            {discoverItem.label}
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <HeaderDropdown
          label="Projects"
          items={projectBrowseItems}
          active={projectsActive}
          pathname={pathname}
        />
        <HeaderDropdown
          label="Reputation"
          href="/reputation"
          items={reputationMenuItems}
          active={reputationActive}
          pathname={pathname}
        />
        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link href={missionsItem.href} />}
            active={isActive(pathname, missionsItem)}
            closeOnClick
            className={cn(
              headerNavItem,
              isActive(pathname, missionsItem) && 'text-foreground',
            )}
          >
            Missions{' '}
            <span className="ml-1 font-mono text-caption text-faint">6</span>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link
            render={<Link href={portfolioItem.href} />}
            active={isActive(pathname, portfolioItem)}
            closeOnClick
            className={cn(
              headerNavItem,
              isActive(pathname, portfolioItem) && 'text-foreground',
            )}
          >
            Portfolio
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <HeaderDropdown
          label="For projects"
          items={projectItems}
          active={forProjectsActive}
          pathname={pathname}
        />
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="isolate z-50 hidden outline-none lg:block"
        >
          <NavigationMenu.Popup
            aria-label="Primary navigation links"
            className="h-(--popup-height) w-(--popup-width) max-h-(--available-height) max-w-(--available-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[opacity,transform,width,height] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:-translate-y-1 data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-98 data-starting-style:opacity-0"
          >
            <NavigationMenu.Viewport className="relative" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

