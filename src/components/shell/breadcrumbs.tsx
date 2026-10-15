'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getAuction, getLaunch, getTradingToken } from '@/lib/data';

type Crumb = { label: string; href?: string };

function projectName(section: string, slug: string) {
  const record =
    section === 'auction'
      ? getAuction(slug)
      : section === 'trade'
        ? getTradingToken(slug)
        : getLaunch(slug);
  return record?.name ?? 'Project';
}

function crumbsFor(pathname: string): Crumb[] {
  const [first, second, third] = pathname.split('/').filter(Boolean);
  switch (first) {
    case undefined:
      return [{ label: 'Explore' }, { label: 'Discover' }];
    case 'launches':
      return [{ label: 'Explore' }, { label: 'Projects' }];
    case 'launch':
    case 'trade':
    case 'auction': {
      const name = projectName(first, second ?? '');
      const tail =
        first === 'trade'
          ? 'Trade'
          : first === 'auction'
            ? 'Auction'
            : third === 'participate'
              ? 'Participate'
              : null;
      const projectHref =
        first === 'launch' && tail ? `/launch/${second}` : undefined;
      return [
        { label: 'Discover', href: '/' },
        { label: name, href: projectHref },
        ...(tail ? [{ label: tail }] : []),
      ];
    }
    case 'explorer':
      return [{ label: 'Explore' }, { label: 'Reputation explorer' }];
    case 'portfolio':
      return [{ label: 'You' }, { label: 'Portfolio' }];
    case 'reputation':
      return [{ label: 'You' }, { label: 'Reputation' }];
    case 'missions':
      return [{ label: 'You' }, { label: 'Missions' }];
    case 'settings':
      return [{ label: 'You' }, { label: 'Account' }];
    case 'onboarding':
      return [{ label: 'You' }, { label: 'Onboarding' }];
    case 'create':
      return [{ label: 'For projects' }, { label: 'Create launch' }];
    case 'dashboard':
      return [
        { label: 'For projects' },
        { label: 'Northstar' },
        { label: 'Dashboard' },
      ];
    case 'campaigns':
      return [{ label: 'For projects' }, { label: 'Campaigns' }];
    case 'developers':
      return [{ label: 'Developers' }, { label: 'API & SDK' }];
    case 'cli':
      return [{ label: 'Developers' }, { label: 'CLI & agents' }];
    default:
      return [{ label: 'LumenRise' }];
  }
}

export function Breadcrumbs() {
  const pathname = usePathname();
  if (!/^\/(launch|trade|auction)\//.test(pathname)) return null;
  if (pathname.startsWith('/trade/')) return (
    <nav aria-label="Back to projects" className="mb-6 min-w-0">
      <Link href="/launches" className="inline-flex min-h-9 items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Projects
      </Link>
    </nav>
  );
  const crumbs = crumbsFor(pathname);
  return (
    <nav aria-label="Breadcrumb" className="mb-6 hidden min-w-0 md:block">
      <ol className="flex items-center gap-2 font-mono text-meta tracking-[0.08em] text-faint uppercase">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={crumb.label}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {last ? (
                <b aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </b>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

