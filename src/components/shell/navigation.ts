import {
  ArrowLeftRight,
  BookOpen,
  ChartPie,
  House,
  Gavel,
  Hexagon,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Rocket,
  Settings,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  match?: string[];
};
export type HeaderNavItem = NavItem & { description: string };

export const discoverItem: NavItem = { label: 'Home', href: '/', icon: House };
export const guideItem: NavItem = { label: 'How it works', href: '/guide', icon: BookOpen };
export const projectBrowseItems: HeaderNavItem[] = [
  {
    label: 'All projects',
    description: 'Browse projects across Stellar.',
    href: '/launches',
    icon: LayoutGrid,
  },
  {
    label: 'Launches',
    description: 'Explore token launches and raise details.',
    href: '/launches?category=launch',
    icon: Rocket,
    match: ['/launch'],
  },
  {
    label: 'Auctions',
    description: 'View auctions and bidding terms.',
    href: '/launches?category=auction',
    icon: Gavel,
    match: ['/auction'],
  },
  {
    label: 'Trading',
    description: 'Browse token markets and trade details.',
    href: '/launches?category=trading',
    icon: ArrowLeftRight,
    match: ['/trade'],
  },
];
export const explorerItem: HeaderNavItem = {
  label: 'Reputation explorer',
  description: 'Explore reputation signals and policies.',
  href: '/explorer',
  icon: Trophy,
};
export const missionsItem: NavItem = {
  label: 'Missions',
  href: '/missions',
  icon: Target,
  count: '6',
};
export const projectItems: HeaderNavItem[] = [
  {
    label: 'Create launch',
    description: 'Configure a new token launch.',
    href: '/create',
    icon: Plus,
  },
  {
    label: 'Project dashboard',
    description: 'Review and manage your projects.',
    href: '/dashboard',
    icon: LayoutDashboard,
    match: ['/campaigns'],
  },
];
export const portfolioItem: NavItem = {
  label: 'Portfolio',
  href: '/portfolio',
  icon: ChartPie,
};
export const reputationItem: NavItem = {
  label: 'Reputation',
  href: '/reputation',
  icon: Hexagon,
};
export const reputationMenuItems: HeaderNavItem[] = [
  {
    label: 'My reputation',
    description: 'Review your activity and reputation.',
    href: '/reputation',
    icon: Hexagon,
  },
  explorerItem,
];
export const settingsItem: NavItem = {
  label: 'Account settings',
  href: '/settings',
  icon: Settings,
};
export const searchPages = [
  discoverItem,
  guideItem,
  ...projectBrowseItems,
  reputationItem,
  explorerItem,
  missionsItem,
  portfolioItem,
  ...projectItems,
  settingsItem,
];

export const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Explore',
    items: [discoverItem, guideItem],
  },
  {
    label: 'Projects',
    items: projectBrowseItems,
  },
  {
    label: 'Reputation',
    items: reputationMenuItems,
  },
  {
    label: 'You',
    items: [missionsItem, portfolioItem],
  },
  {
    label: 'For projects',
    items: projectItems,
  },
];

export function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])];
  if (item.href === '/' && pathname === '/') return true;
  return prefixes.some(
    (prefix) =>
      prefix !== '/' &&
      (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

