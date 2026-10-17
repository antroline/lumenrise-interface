'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { BackLink } from '@/components/page-header';
import {
  compactAmount,
  pairLabel,
  roundAmount,
} from '@/lib/api/launches/display';
import type { LaunchResult } from '@/lib/api/launches/market';
import { useMarket } from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from '../bonding/contract';
import { useScrolledPast, useWideLayout } from '../hooks/use-scrolled-past';
import {
  curveModel,
  modelPrice,
  type CurveModelInput,
} from '../lib/curve-model';
import {
  allocationShare,
  bondingDetails,
  durationLabel,
  graduationPercent,
  detailDate,
  detailAmount,
} from '../lib/bonding-details';
import { LaunchActionCard } from './launch-action-card';
import { LaunchCover } from './launch-cover';
import { LaunchReveal } from './launch-reveal';
import { LaunchCreator } from './launch-creator';
import { LaunchHero, type LaunchFigure } from './launch-hero';
import { LaunchSection } from './launch-panel';
import { LaunchTimeline, type TimelineStep } from './launch-timeline';
import { LaunchTokenomics, type VestingPlan } from './launch-tokenomics';

const UNIT = BigInt(10_000_000);

/** Headline amounts round to cents; exact values stay in titles and the contract details. */
const headline = (raw: string) => detailAmount(roundAmount(raw, 2));

function shortDate(seconds: bigint) {
  return new Date(Number(seconds) * 1000).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function relativeTime(seconds: string, now: number) {
  const diff = Number(seconds) * 1000 - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const text = days
    ? `${days}d ${hours}h`
    : hours
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Term/value rows separated by hairlines. */
function FactRows({ rows }: { rows: (readonly [string, ReactNode])[] }) {
  return (
    <dl className="flex flex-col text-[14px]">
      {rows.map(([term, value]) => (
        <div
          key={term}
          className="grid min-w-0 gap-1 border-t border-divider py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 break-words leading-relaxed">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const now = useNow(30_000);
  // 68px is the sticky app header; the identity docks into the sticky action card, which exists from `lg`.
  const [identityRef, scrolledPast] = useScrolledPast<HTMLDivElement>(68);
  const docked = useWideLayout() && scrolledPast;
  const b = bondingDetails(launch, snapshot);
  const status = b?.status ?? (loading ? 'Loading' : 'Unavailable');
  const metadata = snapshot?.config.params.metadata ?? launch?.metadata;
  const pairAddress = snapshot?.config.params.pair ?? launch?.pair;
  const owner = snapshot?.config.params.owner ?? launch?.owner;
  const label = pairLabel(pairAddress, network);
  const pair =
    label === 'XLM'
      ? 'XLM'
      : tokens?.pairSymbol || (label === 'USDC' ? 'USDC' : 'quote tokens');
  const name = metadata?.name || 'Bonding curve launch';
  const ticker = metadata?.symbol || tokens?.assetSymbol || 'TOKEN';
  const description = metadata?.description?.trim();
  const progress = b
    ? graduationPercent(b.state.quoteReserve, b.curve.graduationTarget)
    : null;
  const price =
    snapshot?.price.toString() ?? market.data?.currentPrice ?? undefined;
  const stale = !!b?.stateStale || (!snapshot && !!market.data?.stateStale);
  const unavailable = loading ? 'Loading…' : 'Unavailable';
  const networkName = `Stellar ${network === 'public' ? 'Mainnet' : 'Testnet'}`;

  const supply = b ? BigInt(b.totalSupply) : undefined;
  const fdv =
    price != null && supply !== undefined
      ? (BigInt(price) * supply) / UNIT
      : undefined;
  const target = b ? BigInt(b.curve.graduationTarget) : undefined;
  const reserve = b ? BigInt(b.state.quoteReserve) : undefined;
  const remaining =
    target !== undefined && reserve !== undefined
      ? target > reserve
        ? target - reserve
        : BigInt(0)
      : undefined;

  const share = (amount: string) =>
    b ? allocationShare(amount, b.totalSupply) : '—';
  const bps = (amount: string) =>
    supply && supply > BigInt(0)
      ? Number((BigInt(amount) * BigInt(10_000)) / supply)
      : 0;

  const curveInput: CurveModelInput | undefined = b
    ? {
        base: BigInt(b.curve.virtualBaseReserve),
        quote: BigInt(b.curve.virtualQuoteReserve),
        capacity: BigInt(b.buckets.curve),
        sold: BigInt(b.state.sold),
        target: BigInt(b.curve.graduationTarget),
      }
    : undefined;
  const model = curveInput ? curveModel(curveInput) : null;
  const startPrice = curveInput
    ? modelPrice(curveInput.base, curveInput.quote, BigInt(0))
    : undefined;
  const graduationPrice =
    curveInput && model?.graduation != null
      ? modelPrice(curveInput.base, curveInput.quote, model.graduation)
      : undefined;
  const multiple = (value: bigint | undefined) =>
    value !== undefined && startPrice && startPrice > BigInt(0)
      ? `${(Number((value * BigInt(100)) / startPrice) / 100).toLocaleString('en-US')}× launch price`
      : undefined;

  const figures: LaunchFigure[] = [
    {
      label: 'Launch price',
      value:
        startPrice === undefined
          ? unavailable
          : `${detailAmount(startPrice.toString())} ${pair}`,
      hint: 'Before any tokens are sold',
    },
    {
      label: 'Price at graduation',
      value:
        graduationPrice === undefined
          ? unavailable
          : `${detailAmount(graduationPrice.toString())} ${pair}`,
      hint:
        graduationPrice === undefined
          ? b
            ? 'Target is beyond the curve allocation'
            : undefined
          : `Estimate · ${multiple(graduationPrice)}`,
    },
    {
      label: 'Fully diluted value',
      value:
        fdv === undefined
          ? unavailable
          : `${compactAmount(fdv.toString())} ${pair}`,
      title:
        fdv === undefined
          ? undefined
          : `${detailAmount(fdv.toString())} ${pair}`,
      hint: 'Total supply × current price',
    },
    {
      label: 'Sold on the curve',
      value: b ? `${compactAmount(b.state.sold)} ${ticker}` : unavailable,
      title: b
        ? `${detailAmount(b.state.sold)} ${ticker}, net of sell-backs`
        : undefined,
      hint: b ? `of ${compactAmount(b.buckets.curve)} for sale` : undefined,
    },
    {
      label: 'Buyers',
      value: b ? b.state.buyerCount.toLocaleString('en-US') : unavailable,
      hint: 'Distinct wallets',
    },
    b?.status === 'Scheduled'
      ? {
          label: 'Trading opens',
          value: relativeTime(b.startsAt, now),
          hint: detailDate(b.startsAt),
        }
      : {
          label: 'Configured end',
          value: b ? relativeTime(b.endsAt, now) : unavailable,
          hint: b ? detailDate(b.endsAt) : undefined,
        },
  ];

  let vesting: VestingPlan = { kind: 'none', summary: 'No team allocation.' };
  let teamTerm = 'No team allocation';
  if (b && BigInt(b.buckets.team) > BigInt(0)) {
    const cliff = BigInt(b.vesting.cliffSeconds);
    const duration = BigInt(b.vesting.durationSeconds);
    const start = BigInt(b.startsAt);
    const cliffText =
      cliff === BigInt(0)
        ? 'no cliff'
        : `a ${durationLabel(b.vesting.cliffSeconds)} cliff`;
    teamTerm =
      duration === BigInt(0)
        ? `${share(b.buckets.team)} of supply, claimable immediately`
        : `${share(b.buckets.team)} of supply, unlocks over ${durationLabel(b.vesting.durationSeconds)}${cliff === BigInt(0) ? ' with no cliff' : ` after ${cliffText}`}`;
    vesting =
      duration === BigInt(0)
        ? {
            kind: 'immediate',
            summary: `The team allocation is claimable immediately, with no vesting.`,
          }
        : {
            kind: 'schedule',
            summary: `Vests to the creator with ${cliffText}, then ${b.vesting.schedule.toLowerCase()} unlocks over ${durationLabel(b.vesting.durationSeconds)}. ${detailAmount(b.state.teamClaimed)} ${ticker} claimed so far.`,
            cliffShare: Number(cliff) / Number(cliff + duration),
            start: shortDate(start),
            cliffEnd: shortDate(start + cliff),
            end: shortDate(start + cliff + duration),
            elapsedShare:
              (now / 1000 - Number(start)) / Number(cliff + duration),
          };
  }

  const timeline: TimelineStep[] = b
    ? [
        {
          label: 'Trading opens',
          value: shortDate(BigInt(b.startsAt)),
          detail:
            b.status === 'Scheduled'
              ? `Opens ${relativeTime(b.startsAt, now)}`
              : 'Curve buying and selling started',
          state: b.status === 'Scheduled' ? 'upcoming' : 'done',
        },
        {
          label: 'Graduation',
          value: `${compactAmount(b.curve.graduationTarget)} ${pair}`,
          detail:
            b.status === 'Graduated'
              ? 'Reached and confirmed by the contract. Curve trading is closed.'
              : b.status === 'Failed'
                ? 'Not reached. Holders can sell back to the curve.'
                : 'Raised in net quote reserves. Curve trading closes when the contract confirms it.',
          state:
            b.status === 'Graduated'
              ? 'done'
              : b.status === 'Failed'
                ? 'halted'
                : b.status === 'Open'
                  ? 'active'
                  : 'upcoming',
        },
        {
          label: 'Configured end',
          value: shortDate(BigInt(b.endsAt)),
          detail:
            'Set in the configuration; the contract does not define what happens at this date.',
          state: now / 1000 >= Number(b.endsAt) ? 'done' : 'upcoming',
        },
      ]
    : [];

  const links = {
    website: launch?.metadata.website,
    x: launch?.metadata.xAccount,
    github: launch?.metadata.github,
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-launch-page
        className="mx-auto w-full max-w-[1320px] pb-16 selection:bg-lime selection:text-ink"
      >
        <div className="mb-4 md:hidden">
          <BackLink href={`/launches?network=${network}`}>Projects</BackLink>
        </div>
        <div className="mb-4 flex flex-col gap-2 text-small empty:hidden">
          {feedback}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <aside
            aria-label="Trade"
            className="order-2 min-w-0 lg:order-none lg:sticky lg:top-10 lg:col-start-2 lg:row-start-1 lg:self-start"
          >
            <LaunchReveal>
              <LaunchActionCard
                name={name}
                ticker={ticker}
                logo={metadata?.logo}
                seed={address}
                docked={docked}
                status={status}
                network={network}
                address={address}
                price={
                  price == null
                    ? market.isPending
                      ? 'Loading…'
                      : 'Unavailable'
                    : `${detailAmount(price)} ${pair}`
                }
                priceHint={
                  price == null
                    ? undefined
                    : [multiple(BigInt(price)), 'before fee']
                        .filter(Boolean)
                        .join(' · ')
                }
                stale={stale}
                opensIn={
                  b?.status === 'Scheduled'
                    ? relativeTime(b.startsAt, now)
                    : undefined
                }
                terms={
                  b
                    ? [
                        [
                          'After graduation',
                          'Curve trading closes. The contract does not create a DEX pool.',
                        ],
                        ['Team', teamTerm],
                        [
                          'Trading fee',
                          b.curve.creatorFeeBps
                            ? `${b.curve.creatorFeeBps / 100}% to the creator, included in every quote`
                            : 'No creator fee',
                        ],
                      ]
                    : []
                }
              />
            </LaunchReveal>
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-1 lg:row-start-1 lg:gap-5">
            <LaunchReveal>
              <LaunchHero
                header={
                  <LaunchCover
                    integrated
                    logo={metadata?.logo}
                    name={name}
                    ticker={ticker}
                    seed={address}
                    status={status}
                    networkName={networkName}
                    links={links}
                    address={address}
                    network={network}
                    docked={docked}
                    identityRef={identityRef}
                  />
                }
                status={status}
                progress={progress}
                raised={b ? headline(b.state.quoteReserve) : '—'}
                raisedTitle={
                  b
                    ? `${detailAmount(b.state.quoteReserve)} ${pair}`
                    : undefined
                }
                target={b ? headline(b.curve.graduationTarget) : '—'}
                remaining={
                  remaining === undefined
                    ? undefined
                    : headline(remaining.toString())
                }
                pair={pair}
                stale={stale}
                curve={
                  b && curveInput
                    ? {
                        input: curveInput,
                        soldLabel: `Now · ${compactAmount(b.state.sold)} sold`,
                        targetLabel: `Graduation · ${compactAmount(b.curve.graduationTarget)} ${pair}`,
                        axisEnd: (end) =>
                          `${compactAmount(end.toString())} ${ticker}`,
                      }
                    : undefined
                }
                figures={figures}
                note="The curve is modelled from the contract settings, not from trade history. Raised means net quote reserves, excluding fees; only the contract status confirms graduation."
              />
            </LaunchReveal>

            <LaunchSection
              id="about"
              title={`About ${name}`}
              meta="From the creator"
            >
              {description ? (
                <p className="max-w-[68ch] whitespace-pre-line break-words text-[14px] leading-[1.7] text-foreground/85">
                  {description}
                </p>
              ) : (
                <p className="text-[14px] text-muted-foreground">
                  {loading
                    ? 'Loading…'
                    : 'The creator has not provided a project description.'}
                </p>
              )}
            </LaunchSection>

            {owner && (
              <LaunchSection id="creator" title="Creator" meta={networkName}>
                <LaunchCreator
                  owner={owner}
                  network={network}
                  currentId={address}
                />
              </LaunchSection>
            )}

            {b && (
              <LaunchSection
                id="tokenomics"
                title="Tokenomics"
                meta={`${compactAmount(b.totalSupply)} ${ticker} total supply`}
              >
                <LaunchTokenomics
                  vesting={vesting}
                  allocations={[
                    {
                      name: 'Bonding curve',
                      bps: bps(b.buckets.curve),
                      share: share(b.buckets.curve),
                      tokens: `${compactAmount(b.buckets.curve)} ${ticker}`,
                      tokensTitle: `${detailAmount(b.buckets.curve)} ${ticker}`,
                      detail: 'Sold to the public through curve trading.',
                    },
                    {
                      name: 'Liquidity pool',
                      bps: bps(b.buckets.pool),
                      share: share(b.buckets.pool),
                      tokens: `${compactAmount(b.buckets.pool)} ${ticker}`,
                      tokensTitle: `${detailAmount(b.buckets.pool)} ${ticker}`,
                      detail:
                        'Earmarked for a pool; pool creation is not implemented.',
                    },
                    {
                      name: 'Team',
                      bps: bps(b.buckets.team),
                      share: share(b.buckets.team),
                      tokens: `${compactAmount(b.buckets.team)} ${ticker}`,
                      tokensTitle: `${detailAmount(b.buckets.team)} ${ticker}`,
                      detail:
                        BigInt(b.buckets.team) === BigInt(0)
                          ? 'No team allocation.'
                          : 'Vests to the creator.',
                    },
                  ]}
                />
              </LaunchSection>
            )}

            {b && (
              <LaunchSection
                id="rules"
                title="How this launch works"
                meta="From the contract configuration"
              >
                <LaunchTimeline steps={timeline} />
                <div className="mt-8 border-t border-divider pt-6">
                  <FactRows
                    rows={[
                      [
                        'Mechanism',
                        `The contract prices ${ticker} from virtual token and quote reserves. Each buy raises the price; each sell-back lowers it.`,
                      ],
                      ['Payment asset', pair],
                      [
                        'Allocation',
                        `${detailAmount(b.buckets.curve)} ${ticker} are sold first come, first served, with no per-wallet limit.`,
                      ],
                      [
                        'Fees',
                        `${b.curve.creatorFeeBps ? `${b.curve.creatorFeeBps / 100}% creator fee on every trade.` : 'No creator fee on trades.'} The platform takes ${b.curve.platformFeeBps / 100}% at graduation.`,
                      ],
                      [
                        'If the target is missed',
                        'Curve buying stops. Holders can sell tokens back to the curve.',
                      ],
                      [
                        'At graduation',
                        'The contract calculates pool allocations and payouts, but does not create a DEX pool or transfer proceeds.',
                      ],
                    ]}
                  />
                </div>
              </LaunchSection>
            )}

            <LaunchSection id="contracts" title="Contracts" meta={networkName}>
              {children}
            </LaunchSection>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
