import { BookOpen, House, Hexagon, LayoutGrid, Plus, Settings, type LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  match?: string[];
};
export type HeaderNavItem = NavItem & { description: string };

export const discoverItem: NavItem = { label: 'Home', href: '/', icon: House };
export const documentationItem: NavItem = {
  label: 'Documentation', href: 'https://docs.lumenrise.app', icon: BookOpen,
};
export const projectBrowseItems: HeaderNavItem[] = [{
  label: 'All projects', description: 'Browse projects across Stellar.',
  href: '/launches', icon: LayoutGrid, match: ['/launch', '/auction'],
}];
export const projectItems: HeaderNavItem[] = [{
  label: 'Create launch', description: 'Configure a new token launch.', href: '/create', icon: Plus,
}];
export const reputationItem: NavItem = { label: 'Reputation', href: '/reputation', icon: Hexagon };
export const settingsItem: NavItem = { label: 'Account Settings', href: '/settings', icon: Settings };

export const mobilePrimaryItems: NavItem[] = [
  discoverItem,
  { ...projectBrowseItems[0], label: 'Projects' },
  { ...projectItems[0], label: 'Create' },
  reputationItem,
];

export const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Primary', items: [discoverItem, ...projectBrowseItems, { ...reputationItem, label: 'My reputation' }] },
  { label: 'For projects', items: projectItems },
  { label: 'Account', items: [documentationItem, settingsItem] },
];

export const searchPages = navGroups.flatMap(group => group.items);
export const mobileDrawerItems: NavItem[] = searchPages;

/** Keep internal navigation on the same server-supported network. */
export function navigationHref(href: string, network?: string | null) {
  if ((href.startsWith('/') && !href.startsWith('//')) && (network === 'public' || network === 'testnet' || network === 'mainnet')) {
    return `${href}?network=${network === 'mainnet' ? 'public' : network}`;
  }
  return href;
}

export function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])];
  if (item.href === '/' && pathname === '/') return true;
  return prefixes.some(prefix => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
}
