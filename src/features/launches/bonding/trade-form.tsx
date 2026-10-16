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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { TradeDisclosure } from '@/features/launches/trading/trade-disclosure';
import { TradeTokenPill } from '@/features/launches/trading/trade-token-pill';
import { TradeValue } from '@/features/launches/trading/trade-value';
import { TradeFeedback } from '@/features/launches/trading/trade-feedback';
import { TokenLogo } from '@/components/token-logo';
import { formatAmount } from './contract';
import { friendlyError } from './friendly-trade-error';
import { useTradeForm } from './use-trade-form';
import type { TradeFormProps } from './trade-form-types';
import styles from './trade-form.module.css';

function SwapBalance({
  label = 'Balance',
  amount,
  symbol,
}: {
  label?: string;
  amount?: bigint;
  symbol: string;
}) {
  return (
    <p className="flex min-h-5 flex-wrap items-baseline gap-x-2 text-sm leading-relaxed">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all font-medium text-foreground tabular-nums">
        {amount === undefined ? '—' : formatAmount(amount, 3)} {symbol}
      </span>
    </p>
  );
}

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
    dialogOpen,
    awaitingApproval,
    dismissConfirmation,
    finishDialogClose,
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
          className={`${styles.pay} gap-2 rounded-2xl bg-muted p-4`}
        >
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
            <FieldLabel
              htmlFor={`${side}-amount`}
              className="text-small font-medium text-muted-foreground"
            >
              {buying ? 'You pay' : `You sell`}
            </FieldLabel>
            {buying && (
              <div
                className={`${styles.presets} grid shrink-0 grid-cols-4 gap-1`}
              >
                {['25', '100', '500'].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-12 rounded-full bg-background px-0 text-small font-medium text-foreground tabular-nums hover:bg-background/35 disabled:bg-lime/10 disabled:text-muted-foreground"
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
                  className="h-8 w-12 rounded-full border border-border bg-black px-0 text-small font-medium text-white tabular-nums hover:bg-black/80 disabled:bg-black disabled:text-white/50"
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
                className="h-8 w-12 rounded-full bg-lime/20 px-0 text-small font-medium text-foreground tabular-nums hover:bg-lime/35 disabled:bg-lime/10 disabled:text-muted-foreground"
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
            <InputGroup
              dir="ltr"
              className="h-14 flex-1 border-0 bg-transparent has-disabled:bg-transparent has-disabled:opacity-100 has-[>[data-align=inline-start]]:[&>input]:pl-1"
            >
              {buying && pair === 'USDC' && (
                <InputGroupAddon
                  aria-hidden="true"
                  className="pl-0 text-[clamp(1.5rem,2vw,2rem)] font-semibold text-muted-foreground"
                >
                  $
                </InputGroupAddon>
              )}
              <InputGroupInput
                id={`${side}-amount`}
                aria-label={
                  buying
                    ? `Amount to pay in ${pair}`
                    : `Sell amount in ${tokens.assetSymbol}`
                }
                className="h-14 rounded-lg border-0 bg-transparent px-0 text-[clamp(1.5rem,2vw,2rem)] font-semibold tabular-nums"
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
            </InputGroup>
            {buying ? pairPill : assetPill}
          </div>
          <div className="flex min-h-5 flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
            {!user ? (
              'Connect wallet to view balance'
            ) : !balances ? (
              'Wallet balance unavailable'
            ) : buying ? (
              <SwapBalance amount={balances.pairHeld} symbol={pair} />
            ) : (
              <>
                <SwapBalance
                  label="Held"
                  amount={balances.held}
                  symbol={tokens.assetSymbol}
                />
                <SwapBalance
                  label="Sellable"
                  amount={sellable}
                  symbol={tokens.assetSymbol}
                />
              </>
            )}
          </div>
          <TradeFeedback>
            {inputError && (
              <p role="alert" className="text-sm text-destructive">
                {inputError}
              </p>
            )}
          </TradeFeedback>
        </Field>
      </FieldGroup>
      <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-muted p-4">
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 text-small font-medium text-muted-foreground">
          <p>You receive · estimated</p>
          <span className="flex items-center gap-2">
            {quoteRead.isFetching && entry ? (
              <span role="status">
                <TradeValue>Updating…</TradeValue>
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex min-h-14 min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 break-all text-[clamp(1.5rem,2vw,2rem)] font-semibold leading-tight tabular-nums">
            <TradeValue>
              {buying
                ? amount !== undefined
                  ? formatAmount(amount, 3)
                  : '—'
                : quote
                  ? formatAmount(quote.user_amount, 3)
                  : '—'}
            </TradeValue>
          </p>
          {buying ? assetPill : pairPill}
        </div>
        <SwapBalance
          amount={buying ? balances?.held : balances?.pairHeld}
          symbol={buying ? tokens.assetSymbol : pair}
        />
      </div>
      <dl className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 text-small tabular-nums">
        <dt className="text-muted-foreground">Fee · included</dt>
        <dd className="break-words text-right">
          <TradeValue>
            {quote ? `${formatAmount(quote.creator_fee, 3)} ${pair}` : '—'}
          </TradeValue>
        </dd>
        <dt className="text-muted-foreground">Minimum received</dt>
        <dd className="break-words text-right">
          <TradeValue>
            {quote
              ? minimumReceived === undefined || limitError
                ? 'Invalid amount'
                : `${formatAmount(minimumReceived, 3)} ${buying ? tokens.assetSymbol : pair}`
              : '—'}
          </TradeValue>
        </dd>
      </dl>
      <TradeDisclosure
        title={`Slippage · ${limitError ? 'Invalid percentage' : `${slippage}%`}`}
      >
        <FieldGroup className="gap-2">
          <Field
            orientation="horizontal"
            data-invalid={!!limitError}
            className="justify-between gap-3"
          >
            <FieldLabel
              htmlFor={`${side}-limit`}
              className="text-small font-medium"
            >
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
              <span
                className="text-small text-muted-foreground"
                aria-hidden="true"
              >
                %
              </span>
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
              <TradeValue>{`${formatAmount(quote.gross, 3)} ${pair}`}</TradeValue>
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
        {pendingHash && !dialogOpen && !working && (
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
      <TradeResultDialog
        open={dialogOpen}
        working={working}
        awaitingApproval={awaitingApproval}
        side={side}
        message={message}
        error={error}
        pendingHash={pendingHash}
        trustHash={trustHash}
        registrationNotice={registrationNotice}
        onCheckPending={() => void recoverPending()}
        confirmation={confirmation}
        onClose={dismissConfirmation}
        onClosed={finishDialogClose}
      />
    </form>
  );
}
