'use client';

import type { Ref } from 'react';

import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';

import { LaunchLogoMark } from './launch-logo-mark';
import { LaunchTypeBadge } from './launch-type-badge';
import { launchElevationRaised } from './launch-panel';
import { LaunchProjectLinks, type LaunchLinks } from './launch-project-links';

const projectBadge =
  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium';

function StatusPill({
  status,
  unified = false,
}: {
  status: string;
  unified?: boolean;
}) {
  const lit = status === 'Open' || status === 'Graduated';
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium',
        unified
          ? cn(
              projectBadge,
              lit
                ? 'bg-ok-soft text-ok'
                : status === 'Failed'
                  ? 'bg-bad-soft text-bad'
                  : status === 'Scheduled'
                    ? 'bg-info-soft text-info'
                    : 'bg-secondary text-secondary-foreground',
            )
          : lit
            ? 'bg-ink text-white'
            : status === 'Failed'
              ? 'bg-warn-soft text-warn'
              : 'bg-card text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          lit && !unified ? 'bg-lime' : 'bg-current',
        )}
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
  compact = false,
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
  compact?: boolean;
}) {
  return (
    <header
      className={cn(
        'relative bg-card p-5 sm:p-6',
        compact && 'bg-transparent p-4 sm:p-5',
        integrated
          ? 'border-b border-divider'
          : ['rounded-2xl', launchElevationRaised],
      )}
    >
      {compact && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <LaunchTypeBadge className={cn(projectBadge, 'bg-secondary py-0 text-muted-foreground dark:bg-secondary dark:text-muted-foreground')}>
            Bonding curve launch
          </LaunchTypeBadge>
          <StatusPill status={status} unified />
        </div>
      )}
      <div
        className={cn(
          'flex flex-col gap-4',
          !compact && 'sm:flex-row sm:items-center sm:justify-between',
        )}
      >
        <div
          ref={identityRef}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="size-16 shrink-0">
            {!docked && (
              <LaunchLogoMark
                logo={logo}
                name={name}
                seed={seed}
                size={64}
                className="ring-1 ring-border"
              />
            )}
          </div>
          <div className="min-w-0">
            <h1
              className={cn(
                'leading-tight font-semibold tracking-[-0.03em] break-words',
                compact ? 'text-[22px]' : 'text-[26px] sm:text-[30px]',
              )}
            >
              {name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">${ticker}</span>
              {!compact && (
                <LaunchTypeBadge>Bonding curve launch</LaunchTypeBadge>
              )}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-col gap-2 empty:hidden',
            !compact && 'sm:max-w-[52%] sm:items-end',
          )}
        >
          <LaunchProjectLinks
            showContract={!compact}
            name={name}
            links={links}
            address={address}
            network={network}
            className={cn('justify-start', !compact && 'sm:justify-end')}
          />
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={status} />
              <span className="inline-flex h-7 items-center rounded-full bg-secondary px-2.5 text-xs text-muted-foreground">
                {networkName}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
