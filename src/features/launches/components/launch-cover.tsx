'use client';

import type { Ref } from 'react';

import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';

import { LaunchLogoMark } from './launch-logo-mark';
import { LaunchTypeBadge } from './launch-type-badge';
import { launchElevationRaised } from './launch-panel';
import { LaunchProjectLinks, type LaunchLinks } from './launch-project-links';

function StatusPill({ status }: { status: string }) {
  const lit = status === 'Open' || status === 'Graduated';
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium',
        lit
          ? 'bg-ink text-white'
          : status === 'Failed'
            ? 'bg-warn-soft text-warn'
            : 'bg-card text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', lit ? 'bg-lime' : 'bg-current')}
      />
      <span className="sr-only">Status: </span>
      {status}
    </span>
  );
}

/** Compact project identity and links within the launch card. */
export function LaunchCover({
  logo,
  name,
  ticker,
  seed,
  status,
  networkName,
  links,
  address,
  network,
  docked,
  identityRef,
  integrated = false,
}: {
  logo?: string;
  name: string;
  ticker: string;
  seed: string;
  status: string;
  networkName: string;
  links: LaunchLinks;
  address: string;
  network: ApiNetwork;
  /** The logo has moved into the action card; keep its space here. */
  docked: boolean;
  identityRef: Ref<HTMLDivElement>;
  integrated?: boolean;
}) {
  return (
    <header className={cn('relative bg-card p-5 sm:p-6', integrated ? 'border-b border-divider' : ['rounded-2xl', launchElevationRaised])}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div ref={identityRef} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="size-16 shrink-0">
            {!docked && (
              <LaunchLogoMark logo={logo} name={name} seed={seed} size={64} className="ring-1 ring-border" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] break-words sm:text-[30px]">{name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">${ticker}</span>
              <LaunchTypeBadge>Bonding curve launch</LaunchTypeBadge>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:max-w-[52%] sm:items-end">
          <LaunchProjectLinks name={name} links={links} address={address} network={network} className="justify-start sm:justify-end" />
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={status} />
            <span className="inline-flex h-7 items-center rounded-full bg-secondary px-2.5 text-xs text-muted-foreground">{networkName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
