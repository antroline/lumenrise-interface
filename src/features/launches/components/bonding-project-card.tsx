'use client';

import { pairScale } from '@/lib/api/launches/display';

import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import { GithubIcon, XLogoIcon } from '@/components/brand-icons';
import { ProfileAvatar } from '@/components/profile-avatar';
import { TokenLogo } from '@/components/token-logo';
import { compactAmount, displayAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import type { Bonding, LaunchListItem } from '@/lib/api/launches/market';
import { shortAddress } from '@/lib/connections';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';

const cardClass = 'relative isolate flex h-full min-h-68 w-[min(24rem,calc(100vw-3rem))] shrink-0 flex-col rounded-[24px] bg-card p-4 text-card-foreground shadow-[0_4px_0_4px_color-mix(in_srgb,var(--card)_65%,transparent),0_12px_24px_-12px_rgb(0_0_0/0.16)]';

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
    <span className={cn(
      'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
      live ? 'bg-lime/35 text-foreground' : 'bg-secondary text-muted-foreground',
    )}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full bg-current', live && 'text-ink/65 dark:text-lime')} />
      {statusText[status]}
    </span>
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
  const description = launch.metadata.description.trim();
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
    <article className={cn(cardClass, 'group transition-transform duration-300 ease-out hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none', className)}>
      <header className="flex items-center gap-2.5">
        <span className="size-11 shrink-0 overflow-hidden rounded-2xl">
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={44} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight font-semibold tracking-tight" title={launch.metadata.name}>
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-[24px] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              <span className="block truncate">{launch.metadata.name}</span>
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={'$' + launch.metadata.symbol + ' · ' + pair}>&#36;{launch.metadata.symbol} · {pair}</p>
        </div>
        <StatusChip status={status} />
      </header>

      <div className="mt-3">
        <p className="text-xs font-medium text-muted-foreground">Curve reserve · {pair}</p>
        <p className="mt-0.5 break-words text-3xl leading-none font-semibold tracking-tight tabular-nums" title={displayAmount(b.state.quoteReserve, undefined, scale) + ' ' + pair}>{amountLabel(b.state.quoteReserve)}</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs tabular-nums">
          <p className="text-muted-foreground" title={targetAvailable ? displayAmount(b.curve.graduationTarget, undefined, scale) + ' ' + pair + ' graduation target' : undefined}>{targetAvailable ? 'Graduation · ' + amountLabel(b.curve.graduationTarget) + ' ' + pair : 'Target unavailable'}</p>
          {targetAvailable && <p className="font-semibold">{progressLabel}</p>}
        </div>
        {targetAvailable && <div role="progressbar" aria-label="Graduation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value * 100} aria-valuetext={progressLabel} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-lime" style={{ width: value * 100 + '%' }} />
        </div>}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <p className="tabular-nums">
            {status === 'Scheduled' ? 'Opens: ' : status === 'Open' && b.endsAt !== null ? 'Ends: ' : ''}
            <span className="font-medium text-card-foreground">
              {status === 'Scheduled' ? unixDate(b.startsAt)
                : status === 'Open' ? b.endsAt === null ? 'No expiry' : unixDate(b.endsAt)
                : statusText[status]}
            </span>
          </p>
          <span title={'Indexed snapshot: ' + launch.stateObservedAt}>
            {b.stateStale ? 'Snapshot outdated' : 'Indexed'}
          </span>
        </div>
      </div>

      <p className="mt-2 min-h-7 truncate pb-2 text-sm leading-5 text-muted-foreground" title={description || undefined}>
        {description}
      </p>

      <footer className="mt-auto flex items-center gap-2 border-t border-border pt-2">
        <ProfileAvatar seed={launch.owner} avatarUrl={owner?.avatarUrl} size={28} radius={14} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={owner?.name || launch.owner}>{owner?.name || shortAddress(launch.owner)}</p>
          <p className="truncate text-xs text-muted-foreground" title={(owner?.role || 'Owner') + ' · Bonding curve'}>{owner?.role || 'Owner'} · Bonding curve</p>
        </div>
        {links.length > 0 && (
          <div className="relative z-10 flex shrink-0 items-center">
            {links.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={launch.metadata.name + ' ' + label} className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-8">
                <Icon aria-hidden="true" className="size-3.5" />
              </a>
            ))}
          </div>
        )}
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-lime group-hover:text-ink motion-reduce:transition-none">
          <ArrowUpRight className="size-4" />
        </span>
      </footer>
    </article>
  );
}

export function BondingProjectCardSkeleton() {
  return (
    <div aria-hidden="true" className={cardClass}>
      <div className="flex items-center gap-2.5">
        <div className="size-11 rounded-2xl bg-secondary" />
        <div className="h-5 w-1/3 rounded bg-secondary" />
      </div>
      <div className="mt-3 h-4 w-1/3 rounded bg-secondary" />
      <div className="mt-0.5 h-7.5 w-1/2 rounded bg-secondary" />
      <div className="mt-2 h-4 w-2/3 rounded bg-secondary" />
      <div className="mt-1.5 h-1.5 rounded-full bg-secondary" />
      <div className="mt-1.5 h-4 w-1/2 rounded bg-secondary" />
      <div className="mt-2 h-5 rounded bg-secondary" />
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-2">
        <div className="size-7 rounded-full bg-secondary" />
        <div className="h-8 w-1/2 rounded bg-secondary" />
      </div>
    </div>
  );
}

