'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Coins, Clock3 } from 'lucide-react';
import { TradeMotion } from '../trading/trade-motion';
import { IndexedPriceChart } from '../trading/indexed-price-chart';
import { TradeActivity } from '../trading/trade-activity';
import { IndexedTrades } from '../trading/indexed-trades';
import { IndexedHolders } from '../trading/indexed-holders';
import { PoolTable } from '../trading/pool-table';
import { useHolders } from '../hooks/use-holders';
import { BackLink } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  compactAmount,
  pairLabel,
  roundAmount,
} from '@/lib/api/launches/display';
import type { LaunchResult } from '@/lib/api/launches/market';
import { useMarket } from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from '../bonding/contract';
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
import { LaunchActionCard, type TradeFormRenderer } from './launch-action-card';
import { LaunchCover } from './launch-cover';
import { LaunchCreator } from './launch-creator';
import { LaunchTeam } from './launch-team';
import { LaunchHero, type LaunchFigure } from './launch-hero';
import { LaunchSection } from './launch-panel';
import { LaunchReveal } from './launch-reveal';
import { LaunchTimeline, type TimelineStep } from './launch-timeline';
import { TradeTooltipText } from '../trading/trade-tooltip';
import { LaunchTokenomics, type VestingPlan } from './launch-tokenomics';
import { LaunchDescription } from './launch-description';

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

function TimelineSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading launch timeline"
      aria-busy="true"
      className="relative grid grid-cols-3 before:absolute before:inset-x-[16.6667%] before:top-14 before:h-px before:bg-neutral-200 sm:before:top-9 dark:before:bg-neutral-700"
    >
      <span className="sr-only">Loading launch timeline…</span>
      {[0, 1, 2].map((step) => (
        <div
          key={step}
          aria-hidden="true"
          className="relative flex min-w-0 flex-col items-center px-1"
        >
          <div className="flex h-8 items-center sm:h-5">
            <Skeleton className="h-4 w-16 max-w-full motion-reduce:animate-none" />
          </div>
          <Skeleton className="mt-2 size-8 rounded-full motion-reduce:animate-none sm:mt-1 sm:size-6" />
          <Skeleton className="mt-2 h-4 w-16 max-w-full motion-reduce:animate-none sm:mt-1.5" />
          <Skeleton className="mt-1 h-3 w-12 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function TokenomicsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading tokenomics"
      aria-busy="true"
      className="flex min-w-0 flex-col gap-6"
    >
      <span className="sr-only">Loading tokenomics…</span>
      <div aria-hidden="true" className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-square w-full max-w-[232px] shrink-0 motion-reduce:animate-none" />
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
              <Skeleton className="h-3.5 w-full max-w-[360px] motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RulesSkeleton() {
  return (
    <div role="status" aria-label="Loading launch rules" aria-busy="true">
      <span className="sr-only">Loading launch rules…</span>
      <div aria-hidden="true" className="flex flex-col">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="grid min-w-0 gap-1 border-t border-divider py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6"
          >
            <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-full max-w-[420px] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

const marketHelp: Record<string, string> = {
  FDV: 'Fully diluted value: total token supply multiplied by the current marginal price. This is not the amount raised.',
  Price: 'Current marginal price on the bonding curve, before trading fees.',
  'Total Volume':
    'Gross payment-asset volume from all verified buys and sells recorded by the API. This is not a complete on-chain volume index.',
  '24h Volume':
    'Gross payment-asset volume from recorded buys and sells in the last 24 hours.',
  '24h Trades':
    'Number of recorded buy and sell transactions in the last 24 hours.',
  Holders:
    'Known balances derived from processed trades. This is not a complete on-chain holder index and may be delayed.',
};

/** Term/value rows separated by hairlines. */
function FactRows({
  rows,
  compact = false,
}: {
  rows: (readonly [string, ReactNode])[];
  compact?: boolean;
}) {
  return (
    <dl className={compact ? 'grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3' : 'flex flex-col text-[14px]'}>
      {rows.map(([term, value]) => (
        <div
          key={term}
          className={
            compact
              ? 'flex min-w-0 flex-col gap-1'
              : 'grid min-w-0 gap-1 border-t border-divider py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6'
          }
        >
          <dt className={compact ? 'text-xs leading-5 text-muted-foreground' : 'text-muted-foreground'}>
            <TradeTooltipText content={compact ? marketHelp[term] : undefined}>
              {term}
            </TradeTooltipText>
          </dt>
          <dd
            className={
              compact
                ? 'min-w-0 break-words text-sm leading-5 font-semibold tabular-nums'
                : 'min-w-0 break-words leading-relaxed'
            }
          >
            {value}
          </dd>
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
  buy,
  sell,
  walletFeedback,
  tradingLoading = false,
}: {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  loading?: boolean;
  feedback: ReactNode;
  children: ReactNode;
  buy?: TradeFormRenderer | null;
  sell?: TradeFormRenderer | null;
  walletFeedback?: ReactNode;
  tradingLoading?: boolean;
}) {
  const market = useMarket(launch?.slug ?? '', network);
  const now = useNow(30_000);
  const [holdersActive, setHoldersActive] = useState(false);
  const holders = useHolders(launch?.slug ?? '', network, holdersActive);
  const b = bondingDetails(launch, snapshot);
  const status = b?.status ?? (loading ? 'Loading' : 'Unavailable');
  const metadata = snapshot?.config.params.metadata ?? launch?.metadata;
  const pairAddress = snapshot?.config.params.pair ?? launch?.pair;
  const owner = snapshot?.config.params.owner ?? launch?.owner;
  const ownerProfile = launch?.team?.find((member) => member.kind === 'owner');
  const label = pairLabel(pairAddress, network);
  const pair =
    label === 'XLM'
      ? 'XLM'
      : tokens?.pairSymbol || (label === 'USDC' ? 'USDC' : 'quote tokens');
  const name = metadata?.name || 'Bonding curve launch';
  const ticker = metadata?.symbol || tokens?.assetSymbol || 'TOKEN';
  const description = launch?.metadata.description?.trim();
  const progress = b
    ? graduationPercent(b.state.quoteReserve, b.curve.graduationTarget)
    : null;
  const price =
    snapshot?.price.toString() ?? market.data?.currentPrice ?? undefined;
  const stale = !!b?.stateStale || (!snapshot && !!market.data?.stateStale);
  const pendingAmount = (
    <Skeleton className="ml-auto h-4 w-20 motion-reduce:animate-none" />
  );
  const networkName = `Stellar ${network === 'public' ? 'Mainnet' : 'Testnet'}`;

  const supply = b ? BigInt(b.totalSupply) : undefined;
  const fdv =
    price != null && supply !== undefined
      ? (BigInt(price) * supply) / UNIT
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
  const graduationPrice =
    curveInput && model?.graduation != null
      ? modelPrice(curveInput.base, curveInput.quote, model.graduation)
      : undefined;

  const figures: LaunchFigure[] = [
    {
      icon: Coins,
      label: 'Tokens sold',
      help: 'Net tokens sold on the curve after sell-backs, compared with the public curve allocation.',
      value: b
        ? `${compactAmount(b.state.sold)} / ${compactAmount(b.buckets.curve)} ${ticker}`
        : 'Unavailable',
      title: b
        ? `${detailAmount(b.state.sold)} of ${detailAmount(b.buckets.curve)} ${ticker}, net of sell-backs`
        : undefined,
    },
    {
      icon: Clock3,
      label: b?.status === 'Scheduled' ? 'Trading opens' : 'Trading expiry',
      help:
        b?.status === 'Scheduled'
          ? 'The configured start of curve trading.'
          : b?.endsAt === null ? 'Current curves trade until graduation, with no time-based expiry.' : 'The configured end date for this legacy curve.',
      value: b
        ? b.status === 'Scheduled' ? relativeTime(b.startsAt, now) : b.endsAt === null ? 'No expiry' : relativeTime(b.endsAt, now)
        : 'Unavailable',
      hint: b && (b.status === 'Scheduled' || b.endsAt !== null)
        ? detailDate(b.status === 'Scheduled' ? b.startsAt : b.endsAt)
        : undefined,
    },
  ];

  let vesting: VestingPlan = { kind: 'none', summary: 'No team allocation.' };
  if (b && BigInt(b.buckets.team) > BigInt(0)) {
    const cliff = BigInt(b.vesting.cliffSeconds);
    const duration = BigInt(b.vesting.durationSeconds);
    const start = BigInt(b.startsAt);
    const cliffText =
      cliff === BigInt(0)
        ? 'no cliff'
        : `a ${durationLabel(b.vesting.cliffSeconds)} cliff`;
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
          caption: `${new Date(Number(b.startsAt) * 1000).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC`,
          detail:
            b.status === 'Scheduled'
              ? `Opens ${relativeTime(b.startsAt, now)}`
              : 'Curve buying and selling started',
          state: b.status === 'Scheduled' ? 'upcoming' : 'done',
        },
        {
          label: 'Graduation',
          value: `${compactAmount(b.curve.graduationTarget)} ${pair}`,
          caption: 'Reserve target',
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
          label: b.endsAt === null ? 'Created' : 'Configured end',
          value: b.endsAt === null
            ? launch?.createdAt ? new Date(launch.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'
            : shortDate(BigInt(b.endsAt)),
          caption: b.endsAt === null ? 'Contract creation · UTC' : 'Legacy expiry · UTC',
          detail: b.endsAt === null
            ? 'Verified on-chain contract creation. Trading has no expiry and continues until graduation.'
            : 'Explicit expiry in this legacy configuration.',
          state: b.endsAt === null ? launch?.createdAt ? 'done' : 'upcoming' : now / 1000 >= Number(b.endsAt) ? 'done' : 'upcoming',
        },
      ]
    : [];

  if (b?.endsAt === null) {
    const creation = timeline.pop();
    if (creation) timeline.unshift(creation);
  }

  const links = {
    website: launch?.metadata.website,
    x: launch?.metadata.xAccount,
    github: launch?.metadata.github,
  };

  return (
    <TradeMotion>
      <div
        data-launch-page
        className="launch-details mx-auto w-full max-w-[1320px] pb-24 lg:pb-16 selection:bg-lime selection:text-ink dark:bg-neutral-950 dark:text-neutral-50 dark:[--muted:var(--color-neutral-800)]! dark:[--surface:var(--color-neutral-800)]! dark:[--input:var(--color-neutral-800)]! [&_section]:shadow-none [&_[data-slot=card]]:shadow-none"
      >
        <div className="mb-4 px-4 sm:px-0 md:hidden">
          <BackLink href={`/projects?network=${network}`}>Projects</BackLink>
        </div>
        <div className="mb-4 flex flex-col gap-2 px-4 text-small empty:hidden sm:px-0">
          {feedback}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <aside
            aria-label="Trade"
            className="order-1 min-w-0 lg:order-none lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start"
          >
            <LaunchActionCard
              name={name}
              identity={
                <LaunchCover
                  integrated
                  compact
                  logo={metadata?.logo}
                  name={name}
                  ticker={ticker}
                  seed={address}
                  status={status}
                  networkName={networkName}
                  links={links}
                  address={address}
                  network={network}
                  docked={false}
                  identityRef={null}
                />
              }
              buy={buy}
              sell={sell}
              walletFeedback={walletFeedback}
              loading={tradingLoading}
            />
          </aside>

          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-1 lg:row-start-1 lg:gap-5">
            <LaunchHero
              priceChart={
                <IndexedPriceChart
                  embedded
                  slug={launch?.slug ?? ''}
                  network={network}
                  ticker={ticker}
                  pair={pair}
                  price={price == null ? '—' : `${detailAmount(price)} ${pair}`}
                />
              }
              status={status}
              progress={progress}
              raised={b ? headline(b.state.quoteReserve) : '—'}
              raisedTitle={
                b ? `${detailAmount(b.state.quoteReserve)} ${pair}` : undefined
              }
              target={b ? headline(b.curve.graduationTarget) : '—'}
              pair={pair}
              stale={stale}
              figures={figures}
              graduationPrice={
                graduationPrice === undefined
                  ? undefined
                  : `${detailAmount(graduationPrice.toString())} ${pair}`
              }
              marketStats={
                <section id="market-stats" aria-labelledby="market-overview-heading" className="mt-4 border border-border bg-white p-4 text-neutral-900 sm:rounded-xl dark:bg-neutral-900 dark:text-neutral-50">
                  <h2 id="market-overview-heading" className="mb-4 text-base font-semibold tracking-tight">
                    Market Overview
                  </h2>
                  {stale && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Indexed data may be outdated
                    </p>
                  )}
                  <FactRows
                    compact
                    rows={[
                      [
                        'FDV',
                        fdv === undefined
                          ? loading
                            ? pendingAmount
                            : 'Unavailable'
                          : `${compactAmount(fdv.toString())} ${pair}`,
                      ],
                      [
                        'Price',
                        price == null
                          ? loading
                            ? pendingAmount
                            : 'Unavailable'
                          : `${detailAmount(price)} ${pair}`,
                      ],
                      [
                        '24h Volume',
                        market.data?.volume24h.grossPairAmount == null
                          ? 'Unavailable'
                          : `${compactAmount(market.data.volume24h.grossPairAmount)} ${pair}`,
                      ],
                      [
                        'Total Volume',
                        market.data?.volumeTotal.grossPairAmount == null
                          ? 'Unavailable'
                          : `${compactAmount(market.data.volumeTotal.grossPairAmount)} ${pair}`,
                      ],
                      [
                        '24h Trades',
                        market.data?.volume24h.tradeCount?.toLocaleString(
                          'en-US',
                        ) ?? 'Unavailable',
                      ],
                      [
                        'Holders',
                        holders.query.data?.totalHolders.toLocaleString(
                          'en-US',
                        ) ?? 'Unavailable',
                      ],
                    ]}
                  />
                  <p className="sr-only">
                    Known holders are derived from recorded trades and may be
                    delayed. They are not a complete on-chain holder index.
                  </p>
                  {market.isError && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      Market data unavailable.{' '}
                      <button
                        type="button"
                        className="underline underline-offset-4"
                        onClick={() => void market.refetch()}
                      >
                        Retry
                      </button>
                    </p>
                  )}
                </section>
              }
              timeline={
                timeline.length > 0 ? (
                  <LaunchTimeline steps={timeline} />
                ) : loading ? (
                  <TimelineSkeleton />
                ) : undefined
              }
              loading={loading && !b}
            />
            <div className="launch-sections flex min-w-0 flex-col border border-border bg-card px-4 text-card-foreground sm:rounded-2xl sm:px-5">
              <LaunchReveal>
                <section
                  id="about"
                  aria-labelledby="about-heading"
                  tabIndex={-1}
                  className="min-w-0 scroll-mt-24 py-4 outline-none sm:py-5"
                >
                  <h2
                    id="about-heading"
                    className="mb-4 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50"
                  >
                    About the project
                  </h2>
                  {description ? (
                    <LaunchDescription key={address} description={description} />
                  ) : loading ? (
                    <div
                      role="status"
                      aria-label="Loading project description"
                      aria-busy="true"
                      className="flex max-w-3xl flex-col gap-2.5"
                    >
                      <span className="sr-only">
                        Loading project description…
                      </span>
                      <Skeleton
                        aria-hidden="true"
                        className="h-4 w-full motion-reduce:animate-none"
                      />
                      <Skeleton
                        aria-hidden="true"
                        className="h-4 w-11/12 motion-reduce:animate-none"
                      />
                      <Skeleton
                        aria-hidden="true"
                        className="h-4 w-2/3 motion-reduce:animate-none"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">
                      The creator has not provided a project description.
                    </p>
                  )}
                </section>
              </LaunchReveal>

              {owner && (
                <LaunchSection id="creator" title="Team" collapsible accordionVariant="plain">
                  {launch && <LaunchTeam owner={launch.owner} slug={launch.slug ?? undefined} network={network} members={launch.team?.filter((member) => member.kind !== 'owner')} />}
                  <LaunchCreator
                    owner={owner}
                    network={network}
                    currentId={address}
                    profile={ownerProfile?.address === owner ? ownerProfile : undefined}
                  />
                </LaunchSection>
              )}

              {(b || loading) && (
                <LaunchSection
                  id="tokenomics"
                  accordionVariant="plain"
                  collapsible
                  title="Tokenomics"
                  meta={
                    b
                      ? `${compactAmount(b.totalSupply)} ${ticker} total supply`
                      : undefined
                  }
                >
                  {!b ? (
                    <TokenomicsSkeleton />
                  ) : (
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
                  )}
                </LaunchSection>
              )}

              {(b || loading) && (
                <LaunchSection
                  id="rules"
                  accordionVariant="plain"
                  collapsible
                  defaultOpen={false}
                  title="How this launch works"
                >
                  {!b ? (
                    <RulesSkeleton />
                  ) : (
                  <div>
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
                  )}
                </LaunchSection>
              )}

              <LaunchSection
                id="contracts"
                accordionVariant="plain"
                collapsible
                defaultOpen={false}
                title="Contracts"
              >
                {children}
              </LaunchSection>
            </div>
            <TradeActivity
              className="border border-border"
              onHoldersActiveChange={setHoldersActive}
              trades={
                <IndexedTrades
                  slug={launch?.slug ?? ''}
                  network={network}
                  ticker={ticker}
                  pair={pair}
                  tradeCount24h={market.data?.volume24h.tradeCount}
                />
              }
              holders={<IndexedHolders holders={holders} ticker={ticker} />}
              pools={
                <PoolTable
                  ticker={ticker}
                  unavailableReason="External pool data is not connected. This contract version does not create a pool or transfer graduation proceeds."
                />
              }
            />
          </div>
        </div>
      </div>
    </TradeMotion>
  );
}
