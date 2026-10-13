'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { TokenLogo } from '@/components/token-logo';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Trajectory } from '@/components/visual-system';
import { displayAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import type { LaunchResult } from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot } from '../_bonding/contract';
import { LaunchPageTemplate } from './launch-page-template';
import type { LaunchContent } from '../_data/launch-content';
import type { LaunchView } from './launch-summary';

export function IndexedLaunchOverview({
  address,
  network,
  launch,
  snapshot,
  feedback,
  children,
}: {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  feedback: ReactNode;
  children: ReactNode;
}) {
  const b = launch?.bonding,
    metadata = launch?.metadata ?? snapshot?.config.params.metadata;
  const pair = pairLabel(launch?.pair ?? snapshot?.config.params.pair, network);
  const view: LaunchView = {
    slug: address,
    name: metadata?.name ?? 'Bonding curve launch',
    ticker: metadata?.symbol ?? '—',
    description: metadata?.description ?? '',
    phase: b?.status === 'Scheduled' ? 'upcoming' : 'live',
    model: b ? 'Bonding curve' : '—',
    raised: b ? `${displayAmount(b.state.quoteReserve)} ${pair}` : '—',
    target: b ? `${displayAmount(b.curve.graduationTarget)} ${pair}` : '—',
    progress: b ? b.progressBps / 100 : null,
    dateLabel: b?.status === 'Scheduled' ? 'Opens' : 'Ends',
    date: unixDate(b?.status === 'Scheduled' ? b.startsAt : b?.endsAt),
    participants: b ? b.state.buyerCount.toLocaleString('en-US') : '—',
    allocation: b ? `${b.allocations.curveBps / 100}%` : '—',
    requirement: 'Unavailable',
    eligibility: { state: 'na', label: 'Unavailable' },
  };
  const content: LaunchContent = {
    overview: metadata?.description || undefined,
  };
  if (b)
    content.tokenomics = {
      totalSupply: `${displayAmount(b.totalSupply)} ${view.ticker}`,
      forSale: `${b.allocations.curveBps / 100}%`,
      allocations: [
        {
          name: 'Curve',
          share: `${b.allocations.curveBps / 100}%`,
          tokens: displayAmount(b.buckets.curve),
          unlock: 'Curve trading',
        },
        {
          name: 'Pool',
          share: `${b.allocations.poolBps / 100}%`,
          tokens: displayAmount(b.buckets.pool),
          unlock: 'Graduation allocation',
        },
        {
          name: 'Team',
          share: `${b.allocations.teamBps / 100}%`,
          tokens: displayAmount(b.buckets.team),
          unlock: `${b.vesting.cliffSeconds}s cliff · ${b.vesting.durationSeconds}s · ${b.vesting.schedule}`,
        },
      ],
    };
  return (
    <LaunchPageTemplate
      launch={view}
      content={content}
      network={network}
      backHref={`/launches?network=${network}`}
      backLabel="Projects"
      mark={
        <TokenLogo
          logo={metadata?.logo}
          name={view.name}
          seed={address}
          size={72}
        />
      }
      status={
        <Badge variant="soft">
          {b?.status ??
            (launch ? 'Unavailable' : (snapshot?.status ?? 'Loading'))}
        </Badge>
      }
      action={
        <Link
          href={`/trade/${address}?network=${network}`}
          className={buttonVariants({
            size: 'lg',
            className: 'mt-6 h-[52px] w-full text-[16px]',
          })}
        >
          Trade {view.ticker}
        </Link>
      }
      heading={
        b?.status === 'Scheduled'
          ? 'Upcoming sale'
          : b?.status === 'Graduated'
            ? 'Graduated launch'
            : b?.status === 'Failed'
              ? 'Launch ended'
              : b?.status === 'Open'
                ? 'Live sale'
                : 'Launch information'
      }
      caption={
        b?.stateStale
          ? 'Snapshot may be outdated'
          : 'Indexed launch information'
      }
      progression={
        b ? (
          <Trajectory
            className="mt-5 -mx-6 px-6 sm:mx-0 sm:px-0"
            size="lg"
            label="Launch progression"
            active={
              b.status === 'Scheduled' ? 0 : b.status === 'Graduated' ? 2 : 1
            }
            steps={[
              { label: 'Announced' },
              { label: 'Curve trading', detail: b.status },
              { label: 'Graduation' },
              { label: 'Trading & claims' },
            ]}
          />
        ) : (
          <p className="mt-5 text-muted-foreground">
            Launch progression unavailable
          </p>
        )
      }
      feedback={feedback}
    >
      {children}
    </LaunchPageTemplate>
  );
}
