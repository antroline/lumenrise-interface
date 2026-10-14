'use client';

import type { ReactNode } from 'react';
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
import {
  displayAmount,
  pairLabel,
  roundAmount,
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
import { PoolTable } from './pool-table';

type Props = {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  loading: boolean;
  refreshAction: ReactNode;
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
  refreshAction,
  feedback,
  walletFeedback,
  buy,
  sell,
}: Props) {
  const market = useMarket(address, network);
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
            overview={`/launch/${address}?network=${network}`}
            actions={refreshAction}
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
                  <dd className="mt-1 text-mid font-semibold">—</dd>
                  <span className="text-small text-muted-foreground">
                    Not indexed
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
          {finished && (
            <Card
              role="region"
              aria-labelledby="graduation-heading"
              className="min-w-0 gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2
                    id="graduation-heading"
                    className="text-title font-semibold"
                  >
                    Graduation
                  </h2>
                  <span className="text-small text-muted-foreground">
                    {status}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">
                  {progress === undefined ? '—' : `${progress.toFixed(2)}%`}
                </span>
              </div>
              {progress !== undefined && (
                <Progress
                  value={Math.min(progress, 100)}
                  tone="lime"
                  aria-label={`${progress.toFixed(2)}% of graduation target`}
                />
              )}
              <dl className="flex flex-wrap justify-between gap-2 text-small tabular-nums">
                <div>
                  <dt className="text-muted-foreground">Net reserves</dt>
                  <dd>
                    {reserve === undefined
                      ? 'Unavailable'
                      : `${detailAmount(roundAmount(reserve.toString(), 3))} ${pair}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target</dt>
                  <dd>
                    {target === undefined
                      ? 'Unavailable'
                      : `${detailAmount(roundAmount(target.toString(), 3))} ${pair}`}
                  </dd>
                </div>
              </dl>
              <p className="text-small text-muted-foreground">
                {status === 'Graduated'
                  ? 'Curve trading ended · pool settlement unavailable.'
                  : 'Target not reached · eligible positions can be sold back.'}
                {bonding && !snapshot && bonding.stateStale
                  ? ' Indexed state may be outdated.'
                  : ''}
              </p>
            </Card>
          )}
          <TradeActivity
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
