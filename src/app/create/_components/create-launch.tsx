'use client';

import { type FormEvent, useState } from 'react';
import { ArrowRight, Coins, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useLaunchpad } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { expandSupply, formatSupply, type SupplyUnit } from '../_launch/amount';
import {
  formatTokenUnits,
  shortAddress,
  validateAmount,
  type LaunchInput,
} from '../_launch/launch-state';
import { useLaunch } from '../_launch/use-launch';
import { LaunchOverview } from './launch-overview';
import { LaunchProgress } from './launch-progress';
import { LaunchReveal, LaunchStatePanel } from './launch-motion';

export function CreateLaunch({
  resumeIssuer,
  initialInput,
  hideIdentity,
  onInputChange,
  onBeforeConnect,
}: {
  resumeIssuer: string | null;
  initialInput: LaunchInput;
  hideIdentity: boolean;
  onInputChange: (input: LaunchInput) => void;
  onBeforeConnect: (input: LaunchInput) => void;
}) {
  const flow = useLaunch(resumeIssuer, initialInput);
  const account = useLaunchpad();
  const {
    input,
    setInput,
    record,
    user,
    working,
    isReady,
    hydrated,
    activity,
    error,
  } = flow;
  const [amountEntry, setAmountEntry] = useState(initialInput.amount);
  const [amountUnit, setAmountUnit] = useState<SupplyUnit>('');
  const busy = working || !isReady || !hydrated;
  const walletMatches = !record || !user || user.address === record.creator;
  const canWithdraw =
    record?.stage === 'complete' &&
    !!record.unlockAt &&
    flow.now >= record.unlockAt * 1000 + 5_000;
  const isFinished =
    record?.stage === 'complete' ||
    record?.stage === 'withdrawPending' ||
    record?.stage === 'withdrawn';
  const preview = record ?? input;
  let amountError = '';
  if (input.amount && !record) {
    try {
      validateAmount(input.amount);
    } catch (cause) {
      amountError =
        cause instanceof Error ? cause.message : 'Enter a valid supply.';
    }
  }

  function updateAmount(value: string) {
    const entry = value.replaceAll(',', '');
    if (!/^\d*(?:\.\d*)?$/.test(entry)) return;
    setAmountEntry(entry);
    updateInput({ ...input, amount: expandSupply(entry, amountUnit) });
  }

  function chooseAmountUnit(unit: SupplyUnit) {
    const next = amountUnit === unit ? '' : unit;
    setAmountUnit(next);
    updateInput({ ...input, amount: expandSupply(amountEntry, next) });
  }

  function updateInput(next: LaunchInput) {
    setInput(next);
    onInputChange(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onBeforeConnect(input);
      void account.login('/create?mode=basic');
      return;
    }
    void flow.launch();
  }

  function continueLaunch() {
    if (!user) {
      void account.login(
        record
          ? `/create?resume=${encodeURIComponent(record.issuer)}`
          : '/create?mode=basic',
      );
      return;
    }
    void flow.resume();
  }

  function withdraw() {
    if (!user) {
      void account.login(
        record
          ? `/create?resume=${encodeURIComponent(record.issuer)}`
          : '/create?mode=basic',
      );
      return;
    }
    void flow.withdraw();
  }

  return (
    <div className="grid items-start gap-5">
      <section
        className={cn(cardVariants({ size: 'lg' }), 'relative order-1 min-w-0')}
        aria-labelledby={isFinished ? 'launch-result' : 'token-details'}
      >
        {isFinished && record ? (
          <LaunchStatePanel key="result">
            <h2
              id="launch-result"
              className="text-[26px] font-semibold tracking-[-0.025em]"
            >
              {record.stage === 'withdrawn'
                ? 'Tokens withdrawn'
                : record.stage === 'withdrawPending'
                  ? 'Withdrawal pending'
                  : 'Tokens locked'}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {record.stage === 'withdrawn'
                ? 'The lock no longer holds this supply.'
                : record.stage === 'withdrawPending'
                  ? 'The withdrawal is being confirmed on Stellar testnet.'
                  : canWithdraw
                    ? 'The lock period has ended. You can withdraw the tokens to your wallet.'
                    : 'The full supply is locked. It becomes available to withdraw after the time below.'}
            </p>
            <dl className="mt-7 grid gap-5 border-y border-divider py-6 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-muted-foreground">
                  {record.stage === 'withdrawn'
                    ? 'Withdrawn supply'
                    : 'Locked supply'}
                </dt>
                <dd className="mt-2 break-all text-[28px] font-semibold tracking-[-0.025em] tabular-nums">
                  {formatSupply(
                    record.lockAmount
                      ? formatTokenUnits(record.lockAmount)
                      : record.amount,
                  )}{' '}
                  <span className="text-[17px]">{record.code}</span>
                </dd>
              </div>
              {record.unlockAt && (
                <div>
                  <dt className="text-[13px] text-muted-foreground">
                    {record.stage === 'withdrawn'
                      ? 'Unlock time'
                      : 'Available to withdraw'}
                  </dt>
                  <dd className="mt-2 text-[17px] font-medium tabular-nums">
                    {new Date(record.unlockAt * 1000).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
            <LaunchReveal show={record.stage !== 'withdrawn' && !walletMatches}>
              <p className="mt-5 text-[14px] text-muted-foreground">
                Connect {shortAddress(record.creator)} to continue.
              </p>
            </LaunchReveal>
            <LaunchReveal show={record.stage === 'complete'}>
              <Button
                type="button"
                size="lg"
                onClick={withdraw}
                disabled={
                  busy || account.loginPending || !walletMatches || !canWithdraw
                }
                className="mt-6 w-full sm:w-auto"
              >
                {working
                  ? 'Working…'
                  : !canWithdraw
                    ? 'Available after unlock'
                    : !user
                      ? 'Connect to withdraw'
                      : 'Withdraw tokens'}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </LaunchReveal>
            <LaunchReveal show={record.stage === 'withdrawPending'}>
              <Button
                type="button"
                size="lg"
                onClick={continueLaunch}
                disabled={busy || account.loginPending || !walletMatches}
                className="mt-6 w-full sm:w-auto"
              >
                {working
                  ? 'Checking…'
                  : !user
                    ? 'Connect and check withdrawal'
                    : 'Check withdrawal'}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </LaunchReveal>
            <div className="mt-8 border-t border-divider pt-7">
              <LaunchOverview record={record} />
            </div>
          </LaunchStatePanel>
        ) : (
          <LaunchStatePanel key="details">
            <h2
              id="token-details"
              className="text-[22px] font-semibold tracking-[-0.02em]"
            >
              Token details
            </h2>
            <form onSubmit={submit} className="mt-5">
              <FieldGroup className="gap-5">
                {!hideIdentity && (
                  <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                    <Field>
                      <FieldLabel htmlFor="launch-name">Name</FieldLabel>
                      <Input
                        id="launch-name"
                        value={input.name}
                        onChange={(event) =>
                          updateInput({ ...input, name: event.target.value })
                        }
                        placeholder="My Token"
                        maxLength={40}
                        required
                        disabled={busy || !!record}
                        className="h-12 text-[15px]"
                      />
                      <FieldDescription>
                        Used as the token name on Stellar.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="launch-code">Symbol</FieldLabel>
                      <Input
                        id="launch-code"
                        value={input.code}
                        onChange={(event) =>
                          updateInput({
                            ...input,
                            code: event.target.value.toUpperCase(),
                          })
                        }
                        placeholder="MYTOKEN"
                        maxLength={12}
                        pattern="[A-Za-z0-9]{1,12}"
                        required
                        disabled={busy || !!record}
                        className="h-12 font-mono text-[15px] tracking-[0.02em]"
                      />
                      <FieldDescription>
                        1–12 letters or numbers.
                      </FieldDescription>
                    </Field>
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="launch-amount">Total supply</FieldLabel>
                  <div className="relative">
                    <Input
                      id="launch-amount"
                      type="text"
                      inputMode="decimal"
                      aria-describedby="launch-amount-description"
                      aria-invalid={!!amountError}
                      value={
                        record
                          ? formatSupply(input.amount)
                          : formatSupply(amountEntry)
                      }
                      onChange={(event) => updateAmount(event.target.value)}
                      placeholder="1,000,000"
                      required
                      disabled={busy || !!record}
                      className="h-12 pr-24 font-mono text-[16px] tabular-nums"
                    />
                    <div
                      className="absolute inset-y-1 right-1 flex items-center gap-1"
                      role="group"
                      aria-label="Supply unit"
                    >
                      {(['M', 'B'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          aria-label={unit === 'M' ? 'Millions' : 'Billions'}
                          aria-pressed={amountUnit === unit}
                          disabled={busy || !!record}
                          onClick={() => chooseAmountUnit(unit)}
                          className={cn(
                            'grid size-9 place-items-center rounded-md text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50',
                            amountUnit === unit
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FieldDescription
                    id="launch-amount-description"
                    aria-live="polite"
                    className={amountError ? 'text-bad' : undefined}
                  >
                    {amountError ||
                      (amountEntry && amountUnit
                        ? `= ${formatSupply(input.amount)} tokens`
                        : 'Up to 7 decimal places.')}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="mt-6 flex gap-3 border-t border-divider pt-4 text-[14px] leading-relaxed">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-warn"
                  aria-hidden="true"
                />
                <p className="max-w-[68ch] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Before signing:
                  </span>{' '}
                  2 XLM funds an issuer that cannot be recovered. Minting is
                  permanently disabled, and no home domain can be added later.
                  Your full balance is locked for 120 seconds. This creates a
                  token, not a sale.
                </p>
              </div>

              <LaunchReveal show={!record}>
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy || account.loginPending || !!amountError}
                  className="mt-6 w-full sm:w-auto"
                >
                  {!hydrated || !isReady
                    ? 'Loading wallet…'
                    : working
                      ? 'Working…'
                      : account.loginPending
                        ? 'Connecting…'
                        : user
                          ? 'Create token'
                          : 'Connect wallet to continue'}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </LaunchReveal>
            </form>

            <LaunchReveal show={!!record}>
              {record && (
                <div className="mt-7 flex flex-col items-start gap-3">
                  <LaunchReveal show={!walletMatches}>
                    <p className="text-[14px] text-muted-foreground">
                      Connect {shortAddress(record.creator)} to continue.
                    </p>
                  </LaunchReveal>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button
                      type="button"
                      size="lg"
                      onClick={continueLaunch}
                      disabled={busy || account.loginPending || !walletMatches}
                      className="w-full sm:w-auto"
                    >
                      {working
                        ? 'Working…'
                        : !user
                          ? 'Connect and continue'
                          : record.stage.endsWith('Pending')
                            ? 'Check transaction'
                            : record.stage === 'issuerReady'
                              ? 'Continue: issue supply'
                              : record.stage === 'sacConfirmed'
                                ? 'Continue: lock tokens'
                                : 'Continue: deploy SAC'}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </LaunchReveal>
          </LaunchStatePanel>
        )}
        <LaunchReveal show={!!(error || (!isFinished && activity))}>
          <p
            role={error ? 'alert' : 'status'}
            aria-live="polite"
            className={cn(
              'mt-5 text-[14px]',
              error ? 'text-bad' : 'text-muted-foreground',
            )}
          >
            {error || activity}
          </p>
        </LaunchReveal>
        <LaunchReveal show={error.includes('Friendbot') && !!user}>
          {user && (
            <a
              className="mt-2 inline-block text-ui font-medium underline underline-offset-4"
              href={`https://friendbot.stellar.org/?addr=${user.address}`}
              target="_blank"
              rel="noreferrer"
            >
              Fund this testnet wallet
            </a>
          )}
        </LaunchReveal>
      </section>

      <aside
        className={cn(
          cardVariants({ size: 'none' }),
          'order-3 min-w-0 rounded-3xl p-4 sm:p-5',
        )}
      >
        <LaunchProgress record={record} step={flow.step} />
      </aside>

      {!isFinished && (
        <aside className="order-2 grid min-w-0 gap-5">
          <section
            className={cn(cardVariants({ size: 'lg' }), 'min-w-0')}
            aria-labelledby="token-preview"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="token-preview"
                className="text-[18px] font-semibold tracking-[-0.015em]"
              >
                {record ? 'Token record' : 'Token preview'}
              </h2>
              <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium tracking-[0.06em]">
                TESTNET
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-4 border-b border-divider pb-6">
              <span
                className="grid size-14 shrink-0 place-items-center rounded-xl bg-ink text-lime"
                aria-hidden="true"
              >
                <Coins className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[21px] font-semibold tracking-[-0.02em]">
                  {preview.name.trim() || 'Your token'}
                </p>
                <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">
                  {preview.code.trim().toUpperCase() || 'ASSET CODE'}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <dt className="text-[13px] text-muted-foreground">
                  Total supply
                </dt>
                <dd className="mt-1 break-all font-mono text-[20px] font-semibold tabular-nums">
                  {preview.amount.trim()
                    ? formatSupply(preview.amount.trim())
                    : '—'}
                </dd>
              </div>
              <div className="border-t border-divider pt-4 sm:border-t-0 sm:pt-0 lg:border-t lg:pt-4">
                <dt className="text-[13px] text-muted-foreground">
                  Token lock
                </dt>
                <dd className="mt-1 text-[15px] font-medium">120 seconds</dd>
              </div>
            </dl>
          </section>
          <LaunchReveal show={!!record}>
            {record && (
              <div className={cn(cardVariants({ size: 'default' }), 'min-w-0')}>
                <LaunchOverview record={record} />
              </div>
            )}
          </LaunchReveal>
        </aside>
      )}
    </div>
  );
}
