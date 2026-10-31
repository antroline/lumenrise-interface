'use client';
import { API_NETWORK } from '@/lib/stellar/network';
import { useLaunchpad } from '@/lib/launchpad';
import { TradeResultDialog } from './trade-result-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { FieldSurface, FormInput } from '@/components/form-controls';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { TradeQuoteDetails } from '@/features/launches/trading/trade-quote-details';
import { TradeValue } from '@/features/launches/trading/trade-value';
import { TradeTooltipText } from '@/features/launches/trading/trade-tooltip';
import { TradeFeedback } from '@/features/launches/trading/trade-feedback';
import { Wallet } from 'lucide-react';
import { formatAmount, UNIT } from './contract';
import { formatBaseAmount, baseExecutionPrice } from '@/lib/base/amount';
import { friendlyError } from './friendly-trade-error';
import { useTradeForm } from './use-trade-form';
import type { BalanceStatus, TradeFormProps } from './trade-form-types';

export function TradeForm(props: TradeFormProps) {
  return <TradeFormView {...props} model={useTradeForm(props)} />;
}
export type TradeFormModel = Omit<ReturnType<typeof useTradeForm>, 'user' | 'quoteRead' | 'quote'> & {
  user: { address: string } | undefined;
  quote: (NonNullable<ReturnType<typeof useTradeForm>['quote']> & { amount_received?: bigint }) | undefined;
  quoteRead: { isFetching: boolean; error: unknown };
};
export type TradeViewProps = Pick<TradeFormProps, 'slug' | 'address' | 'network' | 'side' | 'locked' | 'balances' | 'balanceStatus' | 'quoteHost' | 'active' | 'tokenLogo'> & {
  tokens: Pick<TradeFormProps['tokens'], 'assetSymbol'>;
  snapshot: { price: bigint | undefined };
};
export function TradeFormView(props: TradeViewProps & { model: TradeFormModel; scales?: { asset: number; pair: number } }) {
  const { tokens, side, locked, balances, scales } = props;
  const formatInput = (value: bigint) => scales ? formatBaseAmount(value, side === 'buy' ? scales.pair : scales.asset) : formatAmount(value);
  const formatOutput = (value: bigint, precision?: Parameters<typeof formatAmount>[1]) => scales ? formatBaseAmount(value, side === 'buy' ? scales.asset : scales.pair, precision) : formatAmount(value, precision);
  const formatPair = (value: bigint, precision?: Parameters<typeof formatAmount>[1]) => scales ? formatBaseAmount(value, scales.pair, precision) : formatAmount(value, precision);
  const { login, loginPending } = useLaunchpad();
  const {
    user,
    isReady,
    entry,
    setEntry,
    limitEntry,
    setLimitEntry,
    working,
    message,
    error,
    confirmation,
    dialogOpen,
    awaitingApproval,
    dismissConfirmation,
    finishDialogClose,
    trustHash,
    registrationNotice,
    submittedHash,
    buying,
    pair,
    permitted,
    inputError,
    amount,
    quote,
    quoteError,
    slippage,
    minimumReceived,
    limit,
    limitError,
    sellable,
    unavailable,
    quoteRead,
    submit,
  } = props.model;

  const paySymbol = buying ? pair : tokens.assetSymbol;

  const receiveSymbol = buying ? tokens.assetSymbol : pair;
  const available = buying ? balances?.pairHeld : sellable;
  const received = quote ? (scales ? quote.amount_received : buying ? amount : quote.user_amount) : undefined;
  const quoteLoading = quoteRead.isFetching && entry.trim().length > 0;
  const assetQuoted = scales && buying ? quote?.amount_received : amount;
  const quotedPrice =
    quote && amount !== undefined && assetQuoted !== undefined && assetQuoted > BigInt(0)
      ? scales ? baseExecutionPrice(quote.gross, assetQuoted, scales.asset) : (quote.user_amount * UNIT) / amount
      : undefined;
  const price = quotedPrice ?? props.snapshot.price;
  const needed = buying ? limit : amount;

  const insufficient =
    !!user &&
    available !== undefined &&
    needed !== undefined &&
    needed > available;
  const statusFor = (key: 'held' | 'pairHeld' | 'position'): BalanceStatus =>
    props.balanceStatus?.[key] ?? (balances?.[key] !== undefined ? 'ready' : 'idle');
  const sellableStatuses = [statusFor('held'), statusFor('position')];
  const sellableStatus: BalanceStatus =
    sellable !== undefined
      ? sellableStatuses.includes('stale') ? 'stale' : 'ready'
      : sellableStatuses.includes('error') ? 'error'
        : sellableStatuses.includes('loading') ? 'loading' : 'idle';
  const balanceStatus = buying ? statusFor('pairHeld') : sellableStatus;

  return (
    <form
      id={`${side}-trade`}
      onSubmit={submit}
      className="flex min-w-0 flex-col gap-2.5"
    >
      <div
        className="absolute right-0 top-0 flex h-8 items-center gap-1"
        aria-label="Use a percentage of your available balance"
      >
        {[25, 50, 75, 100].map((percent) => (
          <Button
            key={percent}
            data-trade-control=""
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md bg-secondary px-1.5 text-[10px] font-medium tabular-nums"
            disabled={
              locked ||
              !permitted ||
              available === undefined ||
              available <= BigInt(0)
            }
            onClick={() => {
              if (available !== undefined)
                setEntry(
                  formatInput((available * BigInt(percent)) / BigInt(100)),
                );
            }}
          >
            {`${percent}%`}
          </Button>
        ))}
      </div>
      <FieldGroup>
        <Field
          data-trade-input=""
          data-invalid={!!inputError}
          className="gap-1 rounded-lg bg-muted px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <FieldLabel
              htmlFor={`${side}-amount`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                Amount · {paySymbol}
                {scales && buying && pair === 'USDC' && <img src="/tokens/usdc.svg" alt="" aria-hidden="true" className="size-4 shrink-0" />}
              </span>
            </FieldLabel>
            <span className="text-[10px] text-muted-foreground">
              <TradeTooltipText content="Estimated tokens or payment asset you receive for this amount, based on the current contract quote. The final amount is subject to slippage.">
                Est. receive
              </TradeTooltipText>
            </span>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3">
            <InputGroup
              dir="ltr"
              className="h-9 min-w-0 border-0 bg-transparent shadow-none has-disabled:bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0"
            >
              <InputGroupInput
                id={`${side}-amount`}
                aria-label={
                  buying
                    ? `Amount to pay in ${pair}`
                    : `Sell amount in ${tokens.assetSymbol}`
                }
                className="h-9 min-w-0 border-0 bg-transparent px-0 text-xl font-semibold tabular-nums"
                inputMode="decimal"
                autoComplete="off"
                value={entry}
                disabled={locked || !permitted}
                aria-invalid={!!inputError}
                onChange={(event) => setEntry(event.target.value)}
                placeholder="0.00"
              />
            </InputGroup>
            <output
              id={`${side}-receive`}
              htmlFor={`${side}-amount`}
              aria-label={`Estimated ${receiveSymbol} received`}
              aria-busy={quoteLoading}
              className="min-w-0 break-words text-right text-[13px] leading-5 font-medium text-muted-foreground tabular-nums"
            >
              {quoteLoading ? (
                <span
                  aria-hidden="true"
                  data-slot="skeleton"
                  className="ml-auto block h-5 w-28 max-w-full animate-pulse rounded-md bg-foreground/10 motion-reduce:animate-none"
                />
              ) : (
                <>
                  {received !== undefined && <span aria-hidden="true">≈ </span>}
                  <TradeValue>
                    {received === undefined ? '—' : formatOutput(received, 3)}
                  </TradeValue>{' '}
                  <span className="inline-flex items-center gap-1">
                    {scales && !buying && pair === 'USDC' && <img src="/tokens/usdc.svg" alt="" aria-hidden="true" className="size-4 shrink-0" />}
                    {receiveSymbol}
                  </span>
                </>
              )}
            </output>
          </div>
          {inputError && (
            <p role="alert" className="text-xs text-destructive">
              {inputError}
            </p>
          )}
        </Field>
      </FieldGroup>

      <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 text-xs">
        <dt className="text-muted-foreground">
          <TradeTooltipText
            content={
              quotedPrice === undefined
                ? 'Current contract price per token, before creator and network fees.'
                : scales ? 'Average execution price before creator fees. Network gas is separate.' : 'Average price per token for this quote, including the creator fee. Network fees are separate.'
            }
          >
            {quotedPrice === undefined ? 'Current price' : 'Quoted price'}
          </TradeTooltipText>
        </dt>
        <dd className="min-w-0 break-words text-right font-medium tabular-nums">
          <TradeValue>
            {`1 ${tokens.assetSymbol} ≈ ${price === undefined ? '—' : formatPair(price)} ${pair}`}
          </TradeValue>
        </dd>
      </dl>

      <TradeFeedback>
        {limitError && (
          <p role="alert" className="text-xs text-destructive">
            {limitError}
          </p>
        )}
        {(quoteRead.error || quoteError) && (
          <p role="alert" className="break-words text-xs text-destructive">
            Quote unavailable.{' '}
            {quoteError ||
              friendlyError(quoteRead.error, 'Check the amount and retry.')}
          </p>
        )}
        {unavailable && (
          <p className="text-xs text-muted-foreground">{unavailable}</p>
        )}
      </TradeFeedback>

      <Button
        className="h-11 w-full rounded-lg text-sm font-semibold disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
        type={user ? 'submit' : 'button'}
        onClick={() => {
          if (!user)
            void login(
              props.slug ? `/projects/${encodeURIComponent(props.slug)}?network=${props.network ?? API_NETWORK}` : `/projects?network=${props.network ?? API_NETWORK}`,
            );
        }}
        disabled={
          !user
            ? loginPending
            : !isReady ||
            locked ||
            !permitted ||
            !quote ||
            !!quoteRead.error ||
            !!limitError ||
            limit === undefined ||
            insufficient
        }
      >
        {!user
          ? loginPending
            ? 'Connecting…'
            : 'Connect Wallet'
          : working
            ? 'Processing…'
            : insufficient
              ? `Insufficient ${paySymbol} balance`
              : `${buying ? 'Buy' : 'Sell'} ${tokens.assetSymbol}`}
      </Button>

      <div
        role="status"
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1 text-[11px] text-muted-foreground"
      >
        <Wallet aria-hidden="true" className="size-3.5 shrink-0" />
        {!user ? (
          <span>Connect wallet to view balances</span>
        ) : balanceStatus === 'loading' ? (
          <>
            <span className="sr-only">
              Loading {buying ? paySymbol : 'sellable'} balance
            </span>
            <Skeleton aria-hidden="true" className="h-3 w-16 motion-reduce:animate-none" />
            <span aria-hidden="true">{paySymbol}</span>
          </>
        ) : (
          <span className="break-all tabular-nums">
            {available === undefined ? `${buying ? paySymbol : 'Sellable'} balance unavailable` : <>{buying ? 'Balance: ' : 'Sellable: '}{scales ? formatBaseAmount(available, buying ? scales.pair : scales.asset, 3) : formatAmount(available, 3)} {paySymbol}</>}
            {balanceStatus === 'stale' && ' (outdated)'}
          </span>
        )}
        {!!user && balanceStatus === 'stale' && (
          <span className="w-full pl-5">
            Balance refresh failed. Showing the last available value.
          </span>
        )}
      </div>

      <TradeQuoteDetails
        host={props.quoteHost}
        visible={(props.active ?? true) && entry.trim().length > 0}
      >
        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-2 text-xs tabular-nums">
          <dt className="text-muted-foreground">
            <TradeTooltipText content="The creator fee returned by the contract quote. Already included in the quoted payment; network fees are separate.">
              Fee · included
            </TradeTooltipText>
          </dt>
          <dd className="break-words text-right font-medium">
            <TradeValue>
              {quote ? `${formatPair(quote.creator_fee, 3)} ${pair}` : '—'}
            </TradeValue>
          </dd>
          <dt className="text-muted-foreground">
            <TradeTooltipText
              content={
                buying
                  ? 'The minimum tokens you accept after slippage. Your payment stays within the entered amount.'
                  : 'The minimum payment you accept after your slippage tolerance is applied.'
              }
            >
              Minimum received
            </TradeTooltipText>
          </dt>
          <dd className="break-words text-right font-medium">
            <TradeValue>
              {quote
                ? minimumReceived === undefined || limitError
                  ? 'Invalid amount'
                  : `${formatOutput(minimumReceived, 3)} ${receiveSymbol}`
                : '—'}
            </TradeValue>
          </dd>
        </dl>
        <FieldGroup className="gap-1">
          <Field
            orientation="horizontal"
            data-invalid={!!limitError}
            className="min-w-0 items-center justify-between gap-3"
          >
            <FieldLabel
              htmlFor={`${side}-limit`}
              className="text-xs font-normal text-muted-foreground"
            >
              <TradeTooltipText content="How much less you accept receiving if the price changes. Your payment amount does not increase. Blank uses 0.5%.">
                Slippage
              </TradeTooltipText>
            </FieldLabel>
            <FieldSurface className="h-10 w-28 shrink-0 border-input bg-card px-3 py-0 hover:bg-card focus-within:border-foreground/40">
              <div className="flex h-full min-w-0 items-center gap-1.5">
                <FormInput
                  id={`${side}-limit`}
                  form={`${side}-trade`}
                  className="h-full! flex-1 py-0 text-right text-sm! leading-5 font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  inputMode="decimal"
                  value={limitEntry}
                  disabled={locked || !permitted}
                  aria-invalid={!!limitError}
                  onChange={(event) => setLimitEntry(event.target.value)}
                  placeholder={slippage}
                  aria-describedby={`${side}-slippage-description`}
                />
                <span aria-hidden="true" className="shrink-0 text-sm leading-5 font-medium text-muted-foreground">
                  %
                </span>
              </div>
            </FieldSurface>
          </Field>
          <FieldDescription
            id={`${side}-slippage-description`}
            className="sr-only"
          >
            Blank uses 0.5% slippage.
          </FieldDescription>
        </FieldGroup>
      </TradeQuoteDetails>

      <TradeResultDialog
        open={dialogOpen}
        working={working}
        awaitingApproval={awaitingApproval}
        side={side}
        message={message}
        error={error}
        submittedHash={submittedHash}
        trustHash={trustHash}
        registrationNotice={registrationNotice}
        confirmation={confirmation}
        tokenLogo={props.tokenLogo}
        tokenSeed={props.address}
        onClose={dismissConfirmation}
        onClosed={finishDialogClose}
      />
    </form >
  );
}
