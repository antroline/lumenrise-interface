'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { TokenLogo } from '@/components/token-logo';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { pairLabel } from '@/lib/api/launches/display';
import type { LaunchResult } from '@/lib/api/launches/market';
import { useMarket } from '@/lib/api/launches/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from '../_bonding/contract';
import { API_NETWORK } from '@/app/create/_launch/transactions';
import { LaunchPageTemplate } from './launch-page-template';
import type { LaunchContent } from '../_data/launch-content';
import type { LaunchView } from './launch-summary';
import { GraduationHero } from './graduation-hero';
import { LaunchLifecycle } from './launch-lifecycle';
import { BondingCurveVisualization } from './bonding-curve-visualization';
import styles from './project-detail.module.css';
import { cn } from '@/lib/utils';
import {
  allocationShare,
  bondingDetails,
  curveAvailability,
  durationLabel,
  graduationPercent,
  indexedContract,
  detailDate,
  detailAmount,
} from './bonding-details';

export function IndexedLaunchOverview({
  address,
  network,
  launch,
  snapshot,
  tokens,
  loading = false,
  feedback,
  children,
}: {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  loading?: boolean;
  feedback: ReactNode;
  children: ReactNode;
}) {
  const market = useMarket(address, network);
  const b = bondingDetails(launch, snapshot);
  const statusLabel = b?.status ?? (loading ? 'Loading' : 'Unavailable');
  const metadata = snapshot?.config.params.metadata ?? launch?.metadata;
  const raw = indexedContract(launch);
  const busy = snapshot?.state.busy ?? raw.state?.busy;
  const pairAddress = snapshot?.config.params.pair ?? launch?.pair;
  const nativePair = pairLabel(pairAddress, network) === 'XLM';
  const pair = nativePair ? 'XLM' : tokens?.pairSymbol || 'quote tokens';
  const progress = b
    ? graduationPercent(b.state.quoteReserve, b.curve.graduationTarget)
    : null;
  const available = curveAvailability(b, busy);
  const tradeable =
    network === API_NETWORK &&
    (snapshot ? !!tokens : !b?.stateStale) &&
    (available.buy || available.sell);
  const price = snapshot?.price.toString() ?? market.data?.currentPrice;
  const view: LaunchView = {
    slug: address,
    name: metadata?.name || 'Bonding curve launch',
    ticker: metadata?.symbol || '—',
    description: metadata?.description ?? '',
    phase: b?.status === 'Scheduled' ? 'upcoming' : 'live',
    model: 'Bonding curve',
    raised: b ? `${detailAmount(b.state.quoteReserve)} ${pair}` : '—',
    target: b ? `${detailAmount(b.curve.graduationTarget)} ${pair}` : '—',
    progress,
    dateLabel: 'Ends',
    date: detailDate(b?.endsAt),
    participants: b ? b.state.buyerCount.toLocaleString('en-US') : '—',
    allocation: b ? allocationShare(b.buckets.curve, b.totalSupply) : '—',
    requirement: 'Requirements unavailable',
    eligibility: { state: 'na', label: 'Not evaluated' },
  };
  const content: LaunchContent = {
    overview: metadata?.description || undefined,
  };
  if (b) {
    const teamUnlock =
      BigInt(b.vesting.durationSeconds) === BigInt(0)
        ? 'Immediately claimable by creator'
        : `Cliff: ${durationLabel(b.vesting.cliffSeconds)} · ${durationLabel(b.vesting.durationSeconds)} after cliff · ${b.vesting.schedule.toLowerCase()} unlocks`;
    content.tokenomics = {
      totalSupply: `${detailAmount(b.totalSupply)} ${view.ticker}`,
      forSale: view.allocation,
      allocationLabel: 'curve allocation',
      allocations: [
        {
          name: 'Curve',
          share: allocationShare(b.buckets.curve, b.totalSupply),
          tokens: detailAmount(b.buckets.curve),
          unlock: 'Available through curve trading',
        },
        {
          name: 'Pool',
          share: allocationShare(b.buckets.pool, b.totalSupply),
          tokens: detailAmount(b.buckets.pool),
          unlock: 'Earmarked; pool creation not implemented',
        },
        {
          name: 'Team',
          share: allocationShare(b.buckets.team, b.totalSupply),
          tokens: detailAmount(b.buckets.team),
          unlock:
            BigInt(b.buckets.team) === BigInt(0)
              ? 'No team allocation'
              : teamUnlock,
        },
      ],
    };
  }
  const disabledLabel =
    network !== API_NETWORK
      ? 'Trading unavailable on this network'
      : !b
        ? 'Trading data unavailable'
        : b.status === 'Scheduled'
          ? 'Trading not open yet'
          : b.status === 'Graduated'
            ? 'Curve trading complete'
            : busy
              ? 'Contract busy'
              : snapshot && !tokens
                ? 'Token identities unavailable'
                : !snapshot && b.stateStale
                  ? 'Trading status unavailable'
                  : 'Trading unavailable';
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
      status={<Badge variant="soft">{statusLabel}</Badge>}
      eligibilityNote="This launch response does not include an eligibility policy or a wallet evaluation. Eligibility has not been determined."
      action={
        tradeable ? (
          <Link
            href={`/trade/${address}?network=${network}`}
            className={buttonVariants({
              size: 'lg',
              className: cn(styles.tradeAction, 'mt-6 w-full text-[16px]'),
            })}
          >
            {b?.status === 'Failed'
              ? `Sell back ${view.ticker}`
              : `Trade ${view.ticker}`}
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        ) : (
          <Button
            size="lg"
            disabled
            className={cn(styles.tradeAction, 'mt-6 w-full whitespace-normal')}
          >
            {disabledLabel}
          </Button>
        )
      }
      overview={
        <div className={styles.overview}>
          <GraduationHero
            status={statusLabel}
            progress={progress}
            amount={b ? detailAmount(b.state.quoteReserve) : '—'}
            target={b ? detailAmount(b.curve.graduationTarget) : '—'}
            pair={pair}
            note={`Net quote reserves, excluding trading fees. ${!b ? (loading ? 'Loading contract information…' : 'Contract data unavailable.') : b.stateStale ? 'Indexed snapshot may be outdated.' : snapshot ? 'Live contract snapshot.' : 'Indexed contract snapshot.'}${b && !nativePair && !tokens ? ' Quote-token symbol is unavailable.' : ''}`}
            metrics={[
              {
                label: 'Current token price',
                value:
                  price == null
                    ? market.isPending
                      ? 'Loading…'
                      : 'Unavailable'
                    : `${detailAmount(price)} ${pair}`,
                hint:
                  !snapshot && market.data?.stateStale
                    ? 'Before fee · snapshot may be outdated'
                    : 'Before trading fee',
              },
              {
                label: 'Tokens sold',
                value: b
                  ? `${detailAmount(b.state.sold)} ${view.ticker}`
                  : 'Unavailable',
                hint: 'Net curve purchases',
              },
              {
                label: 'Launch end date',
                value: view.date,
                hint: 'Configured date · UTC',
              },
              {
                label: 'Curve allocation',
                value: view.allocation,
                hint: 'Share of total supply',
              },
            ]}
          />
          {b && <LaunchLifecycle status={b.status} />}
        </div>
      }
      afterTokenomics={
        b && (
          <>
            <BondingCurveVisualization
              input={{
                base: BigInt(b.curve.virtualBaseReserve),
                quote: BigInt(b.curve.virtualQuoteReserve),
                capacity: BigInt(b.buckets.curve),
                sold: BigInt(b.state.sold),
                target: BigInt(b.curve.graduationTarget),
              }}
              ticker={view.ticker}
              pair={pair}
              currentPrice={price}
              stale={b.stateStale || (!snapshot && !!market.data?.stateStale)}
            />
            <section
              className={styles.readingSection}
              aria-labelledby="curve-heading"
            >
              <h2
                id="curve-heading"
                className="text-[22px] font-semibold tracking-[-0.025em] sm:text-[25px]"
              >
                Bonding curve details
              </h2>
              <dl className={styles.mechanism}>
                <div>
                  <dt className="font-semibold">Pricing & fees</dt>
                  <dd className="mt-1 text-muted-foreground">
                    Pricing uses the configured virtual token and quote
                    reserves. Buys increase the marginal price; sell-backs
                    decrease it. Quotes include a {b.curve.creatorFeeBps / 100}%
                    creator trading fee.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Remaining curve supply</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {detailAmount(
                      (
                        BigInt(b.buckets.curve) - BigInt(b.state.sold)
                      ).toString(),
                    )}{' '}
                    {view.ticker} remain of {detailAmount(b.buckets.curve)}{' '}
                    allocated to the curve.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Graduation conditions</dt>
                  <dd className="mt-1 text-muted-foreground">
                    Graduation is based on net quote reserves reaching the
                    configured target. The contract status confirms graduation;
                    reaching the displayed target alone does not confirm the
                    transition.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">After graduation</dt>
                  <dd className="mt-1 text-muted-foreground">
                    This contract stops curve trading. It calculates pool
                    allocations and payout amounts, but does not create a DEX
                    pool or transfer graduation proceeds.
                  </dd>
                </div>
              </dl>
              <p className="text-small text-muted-foreground">
                The configured End Date is shown for reference. End-date
                behavior has not been defined.
              </p>
            </section>
          </>
        )
      }
      feedback={feedback}
    >
      {children}
    </LaunchPageTemplate>
  );
}
