'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeDisclosure } from '../trading/trade-disclosure';
import { TradeTooltipText } from '../trading/trade-tooltip';
import { Blockie } from '@/components/blockie';
import { TokenLogo } from '@/components/token-logo';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { useCreatorLaunches } from '../hooks/queries';
import { launchFocus } from './launch-panel';
import { CopyAddress, ExplorerLink } from './launch-project-links';

const OTHERS_SHOWN = 4;

/**
 * The founding wallet and its other launches on LumenRise. Creator names and photos are
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

  return (
    <div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <article
          aria-label="Founder"
          className="flex min-h-52 min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 overflow-hidden rounded-xl">
              <Blockie seed={owner} size={48} radius={0} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] leading-tight font-semibold">
                <TradeTooltipText content={owner}>
                  {owner.slice(0, 6)}…{owner.slice(-6)}
                </TradeTooltipText>
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                <TradeTooltipText content="The wallet that deployed this launch. A public name and photo are not available.">
                  Founder
                </TradeTooltipText>
              </p>
            </div>
          </div>
          <p className="text-[13px] leading-6 text-muted-foreground">
            Wallet that deployed this launch on LumenRise.
          </p>
          <footer className="-ml-2 mt-auto flex items-center gap-1">
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
          </footer>
        </article>
      </div>

      <div className="mt-4">
        <TradeDisclosure title="Other launches by this creator">
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

          {query.isPending ? (
            <div
              role="status"
              aria-label="Loading other launches"
              className="grid gap-2 sm:grid-cols-2"
            >
              <Skeleton className="h-16 rounded-lg motion-reduce:animate-none" />
              <Skeleton className="h-16 rounded-lg motion-reduce:animate-none" />
            </div>
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
        </TradeDisclosure>
      </div>
    </div>
  );
}
