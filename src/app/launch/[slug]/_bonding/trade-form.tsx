'use client';
import { useLaunchpad } from '@/lib/launchpad';
import { TradeResultDialog } from './trade-result-dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TradeDisclosure } from '@/app/trade/[slug]/_components/trade-disclosure';
import { TradeTokenPill } from '@/app/trade/[slug]/_components/trade-token-pill';
import { TradeValue } from '@/app/trade/[slug]/_components/trade-value';
import { TradeFeedback } from '@/app/trade/[slug]/_components/trade-feedback';
import { TokenLogo } from '@/components/token-logo';
import { formatAmount } from './contract';
import { friendlyError } from './friendly-trade-error';
import { TransactionHash } from './transaction-hash';
import { useTradeForm } from './use-trade-form';
import type { TradeFormProps } from './trade-form-types';

export function TradeForm(props: TradeFormProps) {
  const { address, snapshot, tokens, side, locked, balances } = props;
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
    dismissConfirmation,
    trustHash,
    registrationNotice,
    pendingHash,
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
    recoverPending,
    submit,
  } = useTradeForm(props);
  const assetPill = (
    <TradeTokenPill
      symbol={tokens.assetSymbol}
      mark={
        <TokenLogo
          logo={snapshot.config?.params?.metadata?.logo}
          name={tokens.assetSymbol}
          seed={address}
          size={24}
        />
      }
    />
  );
  const pairPill = (
    <TradeTokenPill
      symbol={pair}
      mark={<TokenLogo name={pair} seed={`${address}:${pair}`} size={24} />}
    />
  );
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-2">
      <FieldGroup>
        <Field
          data-invalid={!!inputError}
          className="gap-2 rounded-2xl bg-muted p-4"
        >
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
            <FieldLabel
              htmlFor={`${side}-amount`}
              className="text-small font-medium text-muted-foreground"
            >
              {buying ? 'You pay' : `You sell`}
            </FieldLabel>
            {buying && (
              <div className="flex gap-1">
                {['25', '100', '500'].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-8 rounded-full bg-background px-2 text-small"
                    disabled={locked || !permitted}
                    onClick={() => {
                      setEntry(value);
                    }}
                  >
                    {value}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-8 rounded-full bg-background px-2 text-small"
                  disabled={
                    locked ||
                    !permitted ||
                    !balances ||
                    balances.pairHeld <= BigInt(0)
                  }
                  onClick={() => {
                    if (balances) {
                      setEntry(formatAmount(balances.pairHeld));
                    }
                  }}
                >
                  All
                </Button>
              </div>
            )}
            {!buying && sellable !== undefined && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={locked || !permitted || sellable <= BigInt(0)}
                onClick={() => {
                  setEntry(formatAmount(sellable));
                }}
              >
                All
              </Button>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Input
              id={`${side}-amount`}
              aria-label={
                buying
                  ? `Amount to pay in ${pair}`
                  : `Sell amount in ${tokens.assetSymbol}`
              }
              className="h-14 rounded-lg border-0 bg-transparent px-0 text-[34px] font-semibold tabular-nums"
              inputMode="decimal"
              autoComplete="off"
              value={entry}
              disabled={locked || !permitted}
              aria-invalid={!!inputError}
              onChange={(event) => {
                setEntry(event.target.value);
              }}
              placeholder="0.0"
            />
            {buying ? pairPill : assetPill}
          </div>
          <p className="flex min-h-5 items-center gap-1 text-small text-muted-foreground tabular-nums">
            {!user
              ? 'Connect wallet to view balance'
              : !balances
                ? 'Wallet balance unavailable'
                : buying
                  ? `Balance ${formatAmount(balances.pairHeld)} ${pair}`
                  : `Held ${formatAmount(balances.held)} · Sellable ${formatAmount(sellable ?? BigInt(0))} ${tokens.assetSymbol}`}
          </p>
          <TradeFeedback>
            {inputError && (
              <p role="alert" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
          </TradeFeedback>
        </Field>
      </FieldGroup>
      <div className="min-w-0 rounded-2xl bg-muted p-4">
        <div className="flex items-center justify-between gap-2 text-small text-muted-foreground">
          <p>You receive · estimated</p>
          <span className="flex items-center gap-2">
            {quoteRead.isFetching && entry ? (
              <span role="status">
                <TradeValue>Updating…</TradeValue>
              </span>
            ) : null}
            {buying ? assetPill : pairPill}
          </span>
        </div>
        <p className="mt-2 min-h-5 break-words text-mid font-semibold tabular-nums">
          <TradeValue>
            {buying
              ? amount !== undefined
                ? `${formatAmount(amount)} ${tokens.assetSymbol}`
                : '—'
              : quote
                ? `${formatAmount(quote.user_amount)} ${pair}`
                : '—'}
          </TradeValue>
        </p>
      </div>
      <dl className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 text-small tabular-nums">
        <dt className="text-muted-foreground">Fee · included</dt>
        <dd className="break-words text-right">
          <TradeValue>
            {quote ? `${formatAmount(quote.creator_fee)} ${pair}` : '—'}
          </TradeValue>
        </dd>
        <dt className="text-muted-foreground">
          Minimum received
        </dt>
        <dd className="break-words text-right">
          <TradeValue>
            {quote
              ? minimumReceived === undefined || limitError
                ? 'Invalid amount'
                : `${formatAmount(minimumReceived)} ${buying ? tokens.assetSymbol : pair}`
              : '—'}
          </TradeValue>
        </dd>
      </dl>
      <TradeDisclosure
        title={`Slippage · ${limitError ? 'Invalid percentage' : `${slippage}%`}`}
      >
        <FieldGroup className="gap-2">
          <Field orientation="horizontal" data-invalid={!!limitError} className="justify-between gap-3">
            <FieldLabel htmlFor={`${side}-limit`} className="text-small font-medium">
              Slippage tolerance
            </FieldLabel>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                id={`${side}-limit`}
                className="h-11 w-11 shrink-0 rounded-md border border-input bg-muted px-1 text-center text-small tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min="0"
                max="99.99"
                step="0.01"
                inputMode="decimal"
                value={limitEntry}
                disabled={locked || !permitted}
                aria-invalid={!!limitError}
                onChange={(event) => setLimitEntry(event.target.value)}
                placeholder="0.5"
                aria-describedby={`${side}-slippage-description`}
              />
              <span className="text-small text-muted-foreground" aria-hidden="true">%</span>
            </div>
          </Field>
          <FieldDescription id={`${side}-slippage-description`}>
            Blank uses 0.5% slippage.
          </FieldDescription>
        </FieldGroup>
        <TradeFeedback>
          {quote && (
            <p className="mt-3 text-small text-muted-foreground tabular-nums">
              Curve amount before fee:{' '}
              <TradeValue>{`${formatAmount(quote.gross)} ${pair}`}</TradeValue>
            </p>
          )}
        </TradeFeedback>
      </TradeDisclosure>
      <TradeFeedback>
        {limitError && (
          <p role="alert" className="text-small text-destructive">
            {limitError}
          </p>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {(quoteRead.error || quoteError) && (
          <p role="alert" className="break-words text-sm text-destructive">
            Quote unavailable.{' '}
            {quoteError ||
              friendlyError(quoteRead.error, 'Check the amount and retry.')}
          </p>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {unavailable && (
          <p className="text-sm text-muted-foreground">{unavailable}</p>
        )}
      </TradeFeedback>
      <Button
        size="lg"
        className="w-full rounded-2xl disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        type={user ? 'submit' : 'button'}
        onClick={
          user
            ? undefined
            : () =>
                void login(
                  `/trade/${address}?network=${props.network ?? 'testnet'}`,
                )
        }
        disabled={
          !user
            ? loginPending
            : !isReady ||
              locked ||
              !!pendingHash ||
              !permitted ||
              !quote ||
              !!quoteRead.error ||
              !!limitError ||
              limit === undefined
        }
      >
        {!user
          ? loginPending
            ? 'Connecting…'
            : 'Connect Wallet'
          : working
            ? 'Processing…'
            : `${buying ? 'Buy' : 'Sell'} ${tokens.assetSymbol}`}
      </Button>

      <TradeFeedback>
        {pendingHash && (
          <>
            <p className="break-all text-sm">
              A submitted trade needs confirmation: {pendingHash}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={locked || !isReady}
              onClick={() => void recoverPending()}
            >
              Check submitted trade
            </Button>
          </>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {message && !confirmation && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {error && (
          <p role="alert" className="break-words text-sm text-destructive">
            {error}
          </p>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {registrationNotice && (
          <p role="status" className="text-sm text-muted-foreground">
            {registrationNotice}
          </p>
        )}
      </TradeFeedback>
      <TradeFeedback>
        {trustHash && !confirmation && (
          <TransactionHash hash={trustHash} label="Trustline transaction" />
        )}
      </TradeFeedback>
      <TradeResultDialog
        confirmation={confirmation}
        onClose={dismissConfirmation}
      />
    </form>
  );
}
