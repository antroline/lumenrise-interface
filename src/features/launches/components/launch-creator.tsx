'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Blockie } from '@/components/blockie';
import { TokenLogo } from '@/components/token-logo';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { useCreatorLaunches } from '../hooks/queries';
import { launchFocus } from './launch-panel';
import { CopyAddress, ExplorerLink } from './launch-project-links';

const OTHERS_SHOWN = 4;

/**
 * The wallet that deployed the launch and its track record on LumenRise. Creator names and photos are
 * not published by the API, so identity is the address and its Blockie.
 */
export function LaunchCreator({
  owner,
  network,
  currentId,
}: {
  owner: string;
  network: ApiNetwork;
  currentId: string;
}) {
  const query = useCreatorLaunches(owner, network);
  const launches = query.data?.launches ?? [];
  const others = launches.filter((launch) => launch.contractId !== currentId);
  const total = query.data?.total;
  const partial = total !== undefined && total > launches.length;
  const count = (status: string) =>
    query.data
      ? launches
          .filter((launch) => launch.bonding?.status === status)
          .length.toLocaleString('en-US')
      : '—';
  const record = [
    {
      label: 'Launches created',
      value: total === undefined ? '—' : total.toLocaleString('en-US'),
    },
    {
      label: 'Graduated',
      value: count('Graduated'),
      hint: partial ? `Among the latest ${launches.length}` : undefined,
    },
    {
      label: 'Open now',
      value: count('Open'),
      hint: partial ? `Among the latest ${launches.length}` : undefined,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
          <Blockie seed={owner} size={64} radius={0} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            title={owner}
            className="truncate text-[22px] leading-tight font-semibold tracking-[-0.03em]"
          >
            {owner.slice(0, 6)}…{owner.slice(-6)}
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Wallet that deployed this launch
          </p>
        </div>
        <div className="-mr-3 flex items-center">
          <CopyAddress
            address={owner}
            label="creator address"
            showAddress={false}
          />
          <ExplorerLink
            address={owner}
            network={network}
            label="creator account"
          />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-divider ring-1 ring-divider">
        {record.map((item) => (
          <div key={item.label} className="min-w-0 bg-card px-4 py-3.5">
            <dt className="text-[12.5px] text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-[20px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">
              {item.value}
            </dd>
            {item.hint && (
              <dd className="mt-0.5 text-[12px] text-muted-foreground">
                {item.hint}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <div className="mt-7">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">
            Other launches by this creator
          </h3>
          {others.length > OTHERS_SHOWN || partial ? (
            <Link
              href={`/launches?network=${network}&owner=${owner}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md text-[13.5px] font-medium hover:underline',
                launchFocus,
              )}
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {query.isPending ? (
          <p className="mt-3 text-[14px] text-muted-foreground">
            Loading the creator&apos;s launches…
          </p>
        ) : query.isError && !query.data ? (
          <p className="mt-3 text-[14px] text-muted-foreground">
            The creator&apos;s other launches could not be loaded.
          </p>
        ) : others.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted-foreground">
            This is the creator&apos;s first launch on LumenRise.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.slice(0, OTHERS_SHOWN).map((launch) => {
              const status = launch.bonding?.status;
              return (
                <li key={launch.contractId} className="min-w-0">
                  <Link
                    href={`/launch/${launch.contractId}?network=${network}`}
                    className={cn(
                      'flex min-w-0 items-center gap-3 rounded-xl p-3 ring-1 ring-divider transition-colors hover:bg-secondary',
                      launchFocus,
                    )}
                  >
                    <span className="shrink-0 overflow-hidden rounded-xl [&_img]:rounded-none">
                      <TokenLogo
                        logo={launch.metadata.logo}
                        name={launch.metadata.name}
                        seed={launch.contractId}
                        size={40}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium">
                        {launch.metadata.name || 'Untitled launch'}
                      </span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        ${launch.metadata.symbol}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[12.5px] tabular-nums">
                      <span
                        className={cn(
                          'block font-medium',
                          status === 'Failed' && 'text-warn',
                        )}
                      >
                        {status ?? 'Unknown'}
                      </span>
                      {launch.bonding && (
                        <span className="block text-muted-foreground">
                          {(launch.bonding.progressBps / 100).toLocaleString(
                            'en-US',
                          )}
                          % of target
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
