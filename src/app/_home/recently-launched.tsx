'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Globe } from 'lucide-react';
import { XLogoIcon } from '@/components/brand-icons';
import { ProfileAvatar } from '@/components/profile-avatar';
import { TokenLogo } from '@/components/token-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { compactAmount, displayAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import { shortAddress } from '@/lib/connections';
import { safeExternalUrl } from '@/features/launches/lib/external-url';
import { launchStatus, progressLabel, type HomeLaunch } from './home-discovery';
import { launchHref } from './use-home-launches';

const listClass = 'min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground';

function openingAge(seconds: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Number(seconds) * 1000) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function amountLabel(raw: string) {
  return BigInt(raw) > BigInt(0) && BigInt(raw) < BigInt(100_000)
    ? displayAmount(raw) : compactAmount(raw);
}

export function RecentlyLaunched({ launches, network, loaded, total, pending, failed }: {
  launches: HomeLaunch[];
  network: ApiNetwork;
  loaded: number;
  total: number;
  pending: boolean;
  failed: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section aria-labelledby="recently-launched-heading" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="recently-launched-heading" className="text-h2 font-semibold">Recently Launched</h2>
          <p className="mt-1 text-sm text-muted-foreground">The latest openings among projects loaded on Home.</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href={`/projects?network=${network}`} />} nativeButton={false}>
          View all <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      {pending ? (
        <div role="status" aria-label="Loading recently launched projects" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl motion-reduce:animate-none sm:h-48 xl:h-28" />
          ))}
        </div>
      ) : launches.length === 0 ? (
        <Empty className="min-h-28 rounded-xl border border-dashed border-border">
          <EmptyDescription>
            {failed ? 'Recently launched projects could not be loaded. Use Try again below to retry.'
              : 'No launched projects with a known opening time were found among the loaded projects. View all to explore this network.'}
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className={listClass}>
          {launches.slice(0, 5).map((launch) => {
            const status = launchStatus(launch);
            const opening = new Date(Number(launch.bonding.startsAt) * 1000);
            const openingLabel = unixDate(launch.bonding.startsAt);
            const bonding = launch.bonding;
            const pair = pairLabel(launch.pair, network);
            const targetAvailable = BigInt(bonding.curve.graduationTarget) > BigInt(0);
            const founder = launch.team?.find((member) => member.kind === 'owner' && member.address === launch.owner);
            const founderName = founder?.name || shortAddress(launch.owner);
            const links = [
              { label: 'Website', href: safeExternalUrl(launch.metadata.website), Icon: Globe },
              { label: 'X', href: safeExternalUrl(launch.metadata.xAccount), Icon: XLogoIcon },
            ].filter((link) => link.href);
            const statusBadge = (
              <Badge size="sm" variant={status === 'Open' || status === 'Filled' ? 'live' : status === 'Failed' ? 'bad' : 'soft'}>
                {status === 'Open' && <span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />}
                {status}
              </Badge>
            );
            return (
              <li key={launch.contractId} className="relative isolate grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-2 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-accent motion-reduce:transition-none sm:grid-cols-3 sm:gap-4 sm:px-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto]">
                <div className="col-span-3 flex min-w-0 items-center gap-3 pr-24 sm:col-span-2 sm:pr-20 xl:col-span-1 xl:pr-0">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                    <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={36} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm leading-tight font-semibold sm:text-base">
                      <Link
                        href={launchHref(launch, network)}
                        title={launch.metadata.name}
                        className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                      >
                        <span className="block truncate">{launch.metadata.name}</span>
                      </Link>
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={`$${launch.metadata.symbol} · ${pair}`}>
                      ${launch.metadata.symbol} · {pair}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 text-xs">
                  <p className="text-muted-foreground">Raised / target<span className="sr-only sm:not-sr-only"> · {pair}</span></p>
                  <p className="mt-1 break-words font-medium tabular-nums" title={`Net reserve, excluding fees: ${displayAmount(bonding.state.quoteReserve)} ${pair}. Graduation target: ${targetAvailable ? `${displayAmount(bonding.curve.graduationTarget)} ${pair}` : 'unavailable'}.`}>
                    {amountLabel(bonding.state.quoteReserve)}
                    <span className="text-muted-foreground"> / {targetAvailable ? amountLabel(bonding.curve.graduationTarget) : '—'}</span>
                  </p>
                </div>
                <div className="min-w-0 text-xs">
                  <p className="sr-only text-muted-foreground sm:not-sr-only">To graduation</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {targetAvailable ? progressLabel(bonding.progressBps) : '—'}
                    <span className="sr-only">{targetAvailable ? ' of graduation target raised' : ' Graduation target unavailable'}</span>
                  </p>
                  {bonding.stateStale && <p className="mt-1 text-muted-foreground">Snapshot outdated</p>}
                </div>
                <div className="hidden min-w-0 items-center gap-2 sm:flex">
                  <ProfileAvatar seed={launch.owner} avatarUrl={founder?.avatarUrl} size={28} radius={14} className="shrink-0" />
                  <div className="min-w-0 text-xs">
                    <p className="text-muted-foreground">Founder</p>
                    <p className="mt-1 truncate font-medium" title={`${founderName} · ${launch.owner}`}>{founderName}</p>
                  </div>
                </div>
                <div className="hidden min-w-0 text-xs sm:block">
                  <p className="text-muted-foreground">Opened</p>
                  <time
                    dateTime={opening.toISOString()}
                    title={`Trading opened: ${opening.toUTCString()}`}
                    className="mt-1 block tabular-nums"
                  >
                    {now === null ? `${openingLabel.split(',')[0]}, ${opening.getUTCFullYear()}` : openingAge(bonding.startsAt, now)}
                  </time>
                </div>
                <div className="flex items-center justify-end gap-2 xl:flex-col xl:items-end xl:gap-1">
                  <span className="absolute top-4 right-4 sm:right-5 xl:static">
                    {statusBadge}
                  </span>
                  {links.length > 0 && (
                    <div className="relative z-10 flex shrink-0 items-center">
                      {links.map(({ label, href, Icon }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${launch.metadata.name} on ${label}`}
                          title={`Open ${launch.metadata.name} on ${label}`}
                          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!pending && !failed && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Sorted by trading opening time. Unknown opening times are omitted.
          {loaded < total && ` Based on ${loaded} of ${total} indexed projects on this network.`}
        </p>
      )}
    </section>
  );
}
