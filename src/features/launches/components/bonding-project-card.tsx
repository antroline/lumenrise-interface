'use client';

import { pairScale } from '@/lib/api/launches/display';

import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import { GithubIcon, XLogoIcon } from '@/components/brand-icons';
import { ProfileAvatar } from '@/components/profile-avatar';
import { TokenLogo } from '@/components/token-logo';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { compactAmount, displayAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import type { Bonding, LaunchListItem } from '@/lib/api/launches/market';
import { shortAddress } from '@/lib/connections';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';

const cardClass = 'relative isolate flex h-full min-h-64 w-[min(22rem,calc(100vw-3rem))] shrink-0 flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground';

const statusText: Record<Bonding['status'] | 'Filled', string> = {
  Open: 'Open',
  Filled: '100% filled',
  Scheduled: 'Upcoming',
  Graduated: 'Graduated',
  Failed: 'Failed',
};

function StatusChip({ status }: { status: Bonding['status'] | 'Filled' }) {
  const live = status === 'Open' || status === 'Filled';
  return (
    <Badge variant="status" data-live={live}>
      {statusText[status]}
    </Badge>
  );
}

export function BondingProjectCard({ launch, href, status, className }: {
  launch: LaunchListItem & { bonding: Bonding };
  href: string;
  status: Bonding['status'] | 'Filled';
  className?: string;
}) {
  const b = launch.bonding;
  const pair = pairLabel(launch.pair, launch.network);
  const value = Math.max(0, Math.min(1, b.progressBps / 10_000));
  const progressLabel = (b.progressBps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
  const owner = launch.team?.find((member) => member.kind === 'owner' && member.address === launch.owner);
  const targetAvailable = BigInt(b.curve.graduationTarget) > BigInt(0);
  const scale = pairScale(launch);
  const amountLabel = (raw: string) => scale !== null && BigInt(raw) > BigInt(0) && BigInt(raw) < BigInt(10) ** BigInt(scale) / BigInt(100)
    ? displayAmount(raw, undefined, scale) : compactAmount(raw, scale);
  const links = [
    { label: 'X', href: safeExternalUrl(launch.metadata.xAccount), Icon: XLogoIcon },
    { label: 'Website', href: safeExternalUrl(launch.metadata.website), Icon: Globe },
    { label: 'GitHub', href: safeExternalUrl(launch.metadata.github), Icon: GithubIcon },
  ].filter((link) => link.href);

  return (
    <article className={cn(cardClass, 'group transition-colors duration-200 hover:border-foreground/30 focus-within:border-foreground/30 motion-reduce:transition-none', className)}>
      <header className="flex items-center gap-3">
        <span className="size-11 shrink-0 overflow-hidden rounded-xl">
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={44} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight font-semibold tracking-tight" title={launch.metadata.name}>
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              <span className="block truncate">{launch.metadata.name}</span>
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={'$' + launch.metadata.symbol}>&#36;{launch.metadata.symbol}</p>
        </div>
        <StatusChip status={status} />
      </header>

      <div className="mt-4 mb-4">
        <dl className="grid grid-cols-2 items-start gap-4">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Curve reserve · {pair}</dt>
            <dd className="mt-1 break-words font-mono text-3xl leading-9 font-semibold tabular-nums" title={displayAmount(b.state.quoteReserve, undefined, scale) + ' ' + pair}>{amountLabel(b.state.quoteReserve)}</dd>
          </div>
          <div className="min-w-0 text-right">
            <dt className="text-xs text-muted-foreground">Graduation target <span className="sr-only">in {pair}</span></dt>
            <dd className="mt-1 break-words font-mono text-2xl leading-9 font-medium tabular-nums" title={targetAvailable ? displayAmount(b.curve.graduationTarget, undefined, scale) + ' ' + pair : undefined}>{targetAvailable ? amountLabel(b.curve.graduationTarget) : '—'}</dd>
          </div>
        </dl>
        {!targetAvailable && <p className="mt-3 text-xs font-medium">Target unavailable</p>}
        {targetAvailable && <div role="progressbar" aria-label="Graduation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value * 100} aria-valuetext={progressLabel + ' filled'} className="relative mt-3 flex h-10 items-center justify-center overflow-hidden rounded-full border border-border bg-white text-ink">
          <div aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-lime to-white" style={{ width: value * 100 + '%' }} />
          <span className="relative px-3 text-sm font-medium tabular-nums"><span className="font-mono text-base font-semibold">{progressLabel}</span> filled</span>
        </div>}
        {(status === 'Scheduled' || (status === 'Open' && b.endsAt !== null)) && (
          <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">
            {status === 'Scheduled' ? 'Opens: ' : 'Ends: '}
            <span className="font-medium text-card-foreground">
              {unixDate(status === 'Scheduled' ? b.startsAt : b.endsAt)}
            </span>
          </p>
        )}
        {b.stateStale && <p className="mt-2.5 text-xs text-warn" title={'Snapshot: ' + launch.stateObservedAt}>Snapshot outdated</p>}
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-border pt-3">
        <ProfileAvatar seed={launch.owner} avatarUrl={owner?.avatarUrl} size={32} radius={4} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={owner?.name || launch.owner}>{owner?.name || <span className="font-mono">{shortAddress(launch.owner)}</span>}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={owner?.role || 'Owner'}>{owner?.role || 'Owner'}</p>
        </div>
        {links.length > 0 && (
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            {links.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={launch.metadata.name + ' ' + label} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11">
                <Icon aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        )}
        <span aria-hidden="true" className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary transition-colors group-hover:bg-lime group-hover:text-ink group-focus-within:bg-lime group-focus-within:text-ink motion-reduce:transition-none">
          <ArrowUpRight className="size-4" />
        </span>
      </footer>
    </article>
  );
}

export function BondingProjectCardSkeleton() {
  return (
    <div aria-hidden="true" className={cardClass}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="mt-3 mb-4 h-10 w-full rounded-full" />
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <Skeleton className="size-8 rounded-sm" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    </div>
  );
}

