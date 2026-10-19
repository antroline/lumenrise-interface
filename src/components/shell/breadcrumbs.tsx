'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Crumb = { label: string; href?: string };

function crumbsFor(pathname: string): Crumb[] {
  const [first, second, third] = pathname.split('/').filter(Boolean);
  switch (first) {
    case 'launch':
    case 'auction': {
      const name = 'Project';
      const tail =
        first === 'auction'
          ? 'Auction'
          : third === 'participate'
            ? 'Participate'
            : null;
      const projectHref =
        first === 'launch' && tail ? `/launch/${second}` : undefined;
      return [
        { label: 'Home', href: '/' },
        { label: name, href: projectHref },
        ...(tail ? [{ label: tail }] : []),
      ];
    }
    default:
      return [];
  }
}

export function Breadcrumbs() {
  const pathname = usePathname();
  if (/^\/launch\/[^/]+\/?$/.test(pathname)) return null;
  if (!/^\/(launch|auction)\//.test(pathname)) return null;
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

