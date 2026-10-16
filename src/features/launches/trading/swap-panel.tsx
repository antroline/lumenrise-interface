'use client';

import { usePreviewSwap } from './use-preview-swap';
import { formatAmount } from './format-preview-amount';
import { TradeTokenPill } from './trade-token-pill';
import { TradeValue } from './trade-value';
import { TradeFeedback } from './trade-feedback';
import { Info, Settings } from 'lucide-react';
import { StellarIcon } from '@/components/brand-icons';
import { ProjectMark, type ProjectMarkName } from '@/components/project-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  TradeTabs,
  TradeTabsList,
  TradeTabsTrigger,
  TradeTabsContent,
  TradeTabPanels,
} from './trade-tabs';
import { TradeDisclosure } from './trade-disclosure';
import {
  BEST_ROUTE,
  NETWORK_FEE_XLM,
  POOL_FEES_XLM,
  PRICE_IMPACT,
  XLM_BALANCE,
  XLM_PER_TOKEN,
  slippageOptions,
} from '../data/trading';

const TOKEN_BALANCE = 0;
export function SwapPanel({
  slug,
  name,
  ticker,
  priceUsd,
}: {
  slug: string;
  name: ProjectMarkName;
  ticker: string;
  priceUsd: number;
}) {
  const {
    isSignedIn,
    loginPending,
    notify,
    payAmount,
    setPayAmount,
    selling,
    slippage,
    setSlippage,
    payToken,
    receiveToken,
    payBalance,
    receive,
    payUsd,
    receiveUsd,
    minimumReceived,
    error,
    submit,
    flip,
  } = usePreviewSwap(slug, ticker, priceUsd);
  const token = (symbol: string) => (
    <TradeTokenPill
      symbol={symbol}
      mark={
        symbol === 'XLM' ? (
          <span className="grid size-6 place-items-center rounded-full bg-foreground text-background">
            <StellarIcon className="size-3.5" />
          </span>
        ) : (
          <ProjectMark name={name} size={24} />
        )
      }
    />
  );
  return (
    <Card variant="surface" size="none" className="bg-transparent">
      <TradeTabs
        value={selling ? 'sell' : 'buy'}
        onValueChange={(value) => {
          if ((value === 'sell' && !selling) || (value === 'buy' && selling))
            flip();
        }}
      >
        <TradeTabsList aria-label="Trade direction">
          <TradeTabsTrigger value="buy">Buy</TradeTabsTrigger>
          <TradeTabsTrigger value="sell">Sell</TradeTabsTrigger>
        </TradeTabsList>
        <TradeTabPanels>
          <TradeTabsContent value={selling ? 'sell' : 'buy'}>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="rounded-2xl bg-muted p-4">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="preview-amount"
                    className="text-small font-medium text-muted-foreground"
                  >
                    {selling ? 'Sell' : 'Buy'} {ticker}
                  </label>
                  <div className="flex gap-1">
                    {[0.5, 1].map((fraction) => (
                      <Button
                        key={fraction}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-8 rounded-full bg-background px-2 text-small"
                        onClick={() =>
                          setPayAmount(
                            String(
                              Math.round(payBalance * fraction * 100) / 100,
                            ),
                          )
                        }
                      >
                        {fraction === 1 ? 'Max' : '50%'}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <input
                    id="preview-amount"
                    aria-label={`Amount to pay in ${payToken}`}
                    aria-invalid={!!error}
                    inputMode="decimal"
                    autoComplete="off"
                    value={payAmount}
                    onChange={(event) => setPayAmount(event.target.value)}
                    placeholder="0"
                    className="h-14 w-full min-w-0 rounded-lg bg-transparent text-[34px] font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-lime/60"
                  />
                  {token(payToken)}
                </div>
                <p className="mt-1 text-small text-muted-foreground">
                  ≈ $<TradeValue>{formatAmount(payUsd)}</TradeValue> · preview
                  balance {formatAmount(payBalance)} {payToken}
                </p>
              </div>
              <TradeFeedback>
                {error && payAmount && (
                  <p role="alert" className="text-small text-destructive">
                    {error}
                  </p>
                )}
              </TradeFeedback>
              <div className="rounded-2xl bg-muted p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-small text-muted-foreground">
                    Receive · estimated
                  </span>
                  {token(receiveToken)}
                </div>
                <p className="mt-2 break-words text-mid font-semibold tabular-nums">
                  <TradeValue>
                    {receive > 0 ? formatAmount(receive) : '—'}
                  </TradeValue>
                </p>
                <p className="mt-1 text-small text-muted-foreground">
                  ≈ $<TradeValue>{formatAmount(receiveUsd)}</TradeValue>
                </p>
              </div>
              <TradeDisclosure title={`Max slippage · ${slippage}%`}>
                <ToggleGroup
                  aria-label="Slippage tolerance"
                  value={[slippage]}
                  onValueChange={(values) => {
                    const next = values[0];
                    if (next === '0.1' || next === '0.5' || next === '1.0')
                      setSlippage(next);
                  }}
                >
                  {slippageOptions.map((option) => (
                    <ToggleGroupItem key={option} value={option} size="sm">
                      {option}%
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </TradeDisclosure>
              <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 text-small tabular-nums">
                <dt className="text-muted-foreground">You pay</dt>
                <dd className="break-words text-right font-semibold">
                  <TradeValue>
                    {payAmount || '—'} {payToken}
                  </TradeValue>
                </dd>
                <dt className="text-muted-foreground">You receive</dt>
                <dd className="break-words text-right font-semibold">
                  <TradeValue>
                    {formatAmount(receive)} {receiveToken}
                  </TradeValue>
                </dd>
                <dt className="text-muted-foreground">Minimum received</dt>
                <dd className="break-words text-right">
                  <TradeValue>
                    {formatAmount(minimumReceived)} {receiveToken}
                  </TradeValue>
                </dd>
                <dt className="text-muted-foreground">Price impact</dt>
                <dd className="text-right">
                  <TradeValue>{PRICE_IMPACT}</TradeValue>
                </dd>
                <dt className="text-muted-foreground">Pool fees</dt>
                <dd className="text-right">
                  <TradeValue>{POOL_FEES_XLM} XLM</TradeValue>
                </dd>
                <dt className="text-muted-foreground">Network fee</dt>
                <dd className="text-right">
                  <TradeValue>{NETWORK_FEE_XLM} XLM</TradeValue>
                </dd>
              </dl>
              <TradeDisclosure title="Quote details">
                <p className="text-small">
                  {selling
                    ? `1 XLM = ${formatAmount(1 / XLM_PER_TOKEN, 4)} ${ticker}`
                    : `1 ${ticker} = ${formatAmount(XLM_PER_TOKEN, 3)} XLM`}
                </p>
                <p className="text-small">Route · {BEST_ROUTE}</p>
                <p className="text-small">
                  Receiving balance · preview ·{' '}
                  {formatAmount(selling ? XLM_BALANCE : TOKEN_BALANCE)}{' '}
                  {receiveToken}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    notify(
                      'Routing is automatic in this preview. Slippage can be adjusted above.',
                    )
                  }
                >
                  <Settings />
                  Swap settings
                </Button>
              </TradeDisclosure>
              <Button
                size="lg"
                className="w-full rounded-2xl disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                disabled={loginPending || (isSignedIn && Boolean(error))}
                onClick={submit}
              >
                {!isSignedIn
                  ? loginPending
                    ? 'Connecting…'
                    : 'Connect Wallet'
                  : `Preview ${selling ? 'sell' : 'buy'}`}
              </Button>
              <div className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2.5 text-small text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Illustrative quotes and balances · trading unavailable.
                  {!selling &&
                    ` A new ${ticker} trustline would reserve 0.5 XLM.`}
                </p>
              </div>
            </div>
          </TradeTabsContent>
        </TradeTabPanels>
      </TradeTabs>
    </Card>
  );
}
