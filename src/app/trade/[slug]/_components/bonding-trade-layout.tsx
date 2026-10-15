'use client';

import { useState, type ReactNode } from 'react';
import { Flag } from 'lucide-react';
import {
  formatAmount,
  type Snapshot,
  type Tokens,
} from '@/app/launch/[slug]/_bonding/contract';
import {
  bondingDetails,
  graduationPercent,
  detailAmount,
} from '@/app/launch/[slug]/_components/bonding-details';
import { TokenLogo } from '@/components/token-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarket } from '@/lib/api/launches/queries';
import { useHolders } from '@/lib/api/launches/use-holders';
import { IndexedHolders } from './indexed-holders';
import {
  displayAmount,
  pairLabel,
  compactAmount,
} from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { LaunchResult } from '@/lib/api/launches/market';
import { TradePageTemplate } from './trade-page-template';
import { TradeHeader } from './trade-header';
import {
  TradeTabs,
  TradeTabsList,
  TradeTabsTrigger,
  TradeTabsContent,
  TradeTabPanels,
} from './trade-tabs';
import { TradeActivity } from './trade-activity';
import { IndexedPriceChart } from './indexed-price-chart';
import { IndexedTrades } from './indexed-trades';
import { IndexedTopTraders } from './indexed-top-traders';
import { PoolTable } from './pool-table';

type Props = {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  loading: boolean;
  feedback: ReactNode;
  walletFeedback?: ReactNode;
  buy: ReactNode;
  sell: ReactNode;
};

export function BondingTradeLayout({
  address,
  network,
  launch,
  snapshot,
  tokens,
  loading,
  feedback,
  walletFeedback,
  buy,
  sell,
}: Props) {
  const market = useMarket(address, network);
  const [holdersActive, setHoldersActive] = useState(false);
  const holders = useHolders(address, network, holdersActive);
  const params = snapshot?.config.params;
  const name =
    launch?.metadata.name || params?.metadata.name || 'Bonding curve launch';
  const ticker =
    launch?.metadata.symbol ||
    tokens?.assetSymbol ||
    params?.metadata.symbol ||
    'Token';
  const pair = tokens
    ? tokens.pair.isNative()
      ? 'XLM'
      : tokens.pairSymbol
    : pairLabel(launch?.pair, network);
  const bonding = bondingDetails(launch, snapshot);
  const target = bonding ? BigInt(bonding.curve.graduationTarget) : undefined;
  const reserve = bonding ? BigInt(bonding.state.quoteReserve) : undefined;
  const progress = bonding
    ? (graduationPercent(
        bonding.state.quoteReserve,
        bonding.curve.graduationTarget,
      ) ?? undefined)
    : undefined;
  const status = bonding?.status ?? (loading ? 'Loading' : 'Unavailable');
  const finished = status === 'Graduated' || status === 'Failed';
  const rawPrice =
    snapshot?.price ??
    (market.data?.currentPrice != null
      ? BigInt(market.data.currentPrice)
      : undefined);
  const price = rawPrice === undefined ? '—' : formatAmount(rawPrice);
  const supply =
    snapshot?.config.total_supply ??
    (launch?.bonding ? BigInt(launch.bonding.totalSupply) : undefined);
  const fdv =
    rawPrice !== undefined && supply !== undefined
      ? (rawPrice * supply) / BigInt(10_000_000)
      : undefined;
  const compact = (raw: bigint) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(Number(raw) / 10_000_000);

  return (
    <TradePageTemplate
      header={
        <>
          <TradeHeader
            mark={
              <TokenLogo
                logo={launch?.metadata.logo ?? params?.metadata.logo}
                name={name}
                seed={address}
                size={64}
              />
            }
            name={name}
            ticker={ticker}
            pair={pair}
            address={address}
            links={{ website: launch?.metadata.website, x: launch?.metadata.xAccount, github: launch?.metadata.github }}
            status={
              <>
                <Badge variant="soft" size="sm" className="border-0">
                  {status}
                  {snapshot?.state.busy ? ' · Busy' : ''}
                </Badge>
                {/* <span>{network === 'public' ? 'Mainnet' : 'Testnet'}</span> */}
              </>
            }
            price={price}
            priceNote={
              snapshot
                ? 'Before fees'
                : market.data?.stateStale
                  ? 'Indexed · may be outdated'
                  : market.data?.priceObservedAt
                    ? 'Indexed · before fees'
                    : loading || market.isPending
                      ? 'Loading…'
                      : 'Unavailable'
            }
            fdv={
              fdv === undefined ? undefined : (
                <span
                  title={`${formatAmount(fdv)} ${pair} · total supply × marginal price`}
                >
                  ≈{compact(fdv)}
                </span>
              )
            }
            metrics={
              <>
                <div className="min-w-0">
                  <dt className="text-small text-muted-foreground">
                    24h volume · {pair}
                  </dt>
                  <dd className="mt-1 break-words text-mid font-semibold">
                    {market.data?.volume24h.grossPairAmount != null
                      ? compact(BigInt(market.data.volume24h.grossPairAmount))
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-small text-muted-foreground">
                    Liquidity
                  </dt>
                  <dd className="mt-1 text-mid font-semibold">—</dd>
                  <span className="text-small text-muted-foreground">
                    Not connected
                  </span>
                </div>
                <div>
                  <dt className="text-small text-muted-foreground">Holders</dt>
                  <dd className="mt-1 text-mid font-semibold">
                    {holders.query.data?.totalHolders.toLocaleString('en-US') ?? '—'}
                  </dd>
                  <span className="text-small text-muted-foreground" title="Known holders from recorded trades; updates may be delayed. Not a complete on-chain holder index.">
                    {holders.query.isPending ? 'Loading…' : holders.query.isError ? 'Unavailable' : 'Known holders'}
                  </span>
                </div>
              </>
            }
          />
          {feedback}
          {market.isError && (
            <p role="alert" className="text-small text-destructive">
              Market data unavailable.{' '}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void market.refetch()}
              >
                Retry
              </Button>
            </p>
          )}
        </>
      }
      market={
        <IndexedPriceChart
          address={address}
          network={network}
          ticker={ticker}
          pair={pair}
          price={`${price} ${pair}`}
        />
      }
      swap={
        <Card variant="surface" size="none" className="gap-0 bg-transparent">
          {snapshot && tokens ? (
            <TradeTabs defaultValue="buy">
              <TradeTabsList aria-label="Trade direction">
                <TradeTabsTrigger value="buy">Buy</TradeTabsTrigger>
                <TradeTabsTrigger value="sell">Sell</TradeTabsTrigger>
              </TradeTabsList>
              <TradeTabPanels>
                <TradeTabsContent value="buy">{buy}</TradeTabsContent>
                <TradeTabsContent value="sell">{sell}</TradeTabsContent>
              </TradeTabPanels>
            </TradeTabs>
          ) : loading ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="text-small text-muted-foreground">
                Loading verified trading configuration…
              </span>
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-4 text-small text-muted-foreground">
              Verified token and contract data are required to trade.
              {network === 'public' &&
                ' Wallet trading is available on Testnet.'}
            </p>
          )}
          {walletFeedback && (
            <div className="mt-3 rounded-2xl bg-muted p-3 text-small">
              {walletFeedback}
            </div>
          )}
        </Card>
      }
      footer={
        <>
          {bonding && (
            <Card
              variant="surface"
              size="none"
              role="region"
              aria-labelledby="graduation-heading"
              className="min-w-0 gap-3 bg-lime px-4 py-3 text-ink"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Flag aria-hidden="true" className="size-4 shrink-0" />
                  <h2 id="graduation-heading" className="text-sm font-semibold">Graduation</h2>
                  <Badge variant="lime" size="sm" className="bg-ink/10 text-ink">{status}</Badge>
                </div>
                <span className="text-mid font-semibold tabular-nums">
                  {progress === undefined ? 'Unavailable' : `${progress.toFixed(2)}%`}
                </span>
              </div>
              {progress !== undefined && (
                <Progress
                  value={Math.min(progress, 100)}
                  size="thick"
                  aria-label={`${progress.toFixed(2)}% of graduation target`}
                  className="w-full [&_[data-slot=progress-track]]:bg-transparent [&_[data-slot=progress-track]]:ring-1 [&_[data-slot=progress-track]]:ring-inset [&_[data-slot=progress-track]]:ring-ink/60 [&_[data-slot=progress-indicator]]:bg-ink motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
                />
              )}
              <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-small tabular-nums">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <dt className="text-ink/80">Net reserves</dt>
                  <dd className="font-semibold" title={reserve === undefined ? undefined : `${detailAmount(reserve.toString())} ${pair}`}>
                    {reserve === undefined ? 'Unavailable' : compactAmount(reserve.toString())} {pair}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <dt className="text-ink/80">Target</dt>
                  <dd className="font-semibold" title={target === undefined ? undefined : `${detailAmount(target.toString())} ${pair}`}>
                    <span>{target === undefined ? 'Unavailable' : compactAmount(target.toString())} {pair}</span>
                  </dd>
                </div>
              </dl>
              {(finished || (!snapshot && bonding.stateStale)) && (
                <p className="text-small text-ink/80">
                  {status === 'Graduated' ? 'Curve trading ended · pool settlement unavailable.'
                    : status === 'Failed' ? 'Target not reached · eligible positions can be sold back.' : ''}
                  {!snapshot && bonding.stateStale ? ' Indexed state may be outdated.' : ''}
                </p>
              )}
            </Card>
          )}
          <TradeActivity
            topTraders={<IndexedTopTraders address={address} network={network} pair={pair} />}
            holders={<IndexedHolders holders={holders} ticker={ticker} />}
            onHoldersActiveChange={setHoldersActive}
            trades={
              <IndexedTrades
                address={address}
                network={network}
                ticker={ticker}
                pair={pair}
                tradeCount24h={market.data?.volume24h.tradeCount}
                volume24h={
                  market.data?.volume24h.grossPairAmount == null
                    ? undefined
                    : displayAmount(market.data.volume24h.grossPairAmount, 3)
                }
              />
            }
            pools={
              <PoolTable
                ticker={ticker}
                unavailableReason="External pool data is not connected. This contract version does not create a pool or transfer graduation proceeds."
              />
            }
          />
        </>
      }
    />
  );
}
