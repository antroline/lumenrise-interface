'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  readContracts,
  useBlux,
  useReadContracts,
  useWriteContract,
} from '@bluxcc/react';
import { StrKey } from '@stellar/stellar-sdk';
import {
  API_NETWORK,
  NETWORK,
} from '@/lib/stellar/clients';
import { enqueueTrade } from '@/lib/api/launches/trade-queue';
import { usePageVisible } from '@/features/launches/hooks/queries';
import {
  decodeQuote,
  decodeState,
  defaultLimit,
  errorMessage,
  formatAmount,
  integer,
  parseAmount,
} from './contract';
import {
  checkReceivingCapacity,
  confirmTransaction,
  ensureTradeTrustlines,
} from './trade';
import { buyAmountForBudget } from './buy-amount-for-budget';
import { recoverSubmittedTransaction } from '../../../lib/stellar/confirmation';
import { friendlyError } from './friendly-trade-error';
import type { TradeConfirmation } from './trade-result-dialog';
import type { TradeFormProps } from './trade-form-types';
export function useTradeForm({
  address,
  slug,
  network = API_NETWORK,
  snapshot,
  tokens,
  side,
  locked,
  setLocked,
  refresh,
  balances,
}: TradeFormProps) {
  const { user, isReady, sendTransaction } = useBlux();
  const { mutateAsync: writeContract } = useWriteContract<{
    gross: number,
    creator_fee: number,
    user_amount: number,
    amount_received: number
  }>();
  const [entry, setEntry] = useState('');
  const [debouncedEntry, setDebouncedEntry] = useState('');
  const [limitEntry, setLimitEntry] = useState('');
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<TradeConfirmation>();
  const [trustHash, setTrustHash] = useState<string>();
  const [registrationNotice, setRegistrationNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const visible = usePageVisible();
  function queueHash(hash: string) {
    if (user && !enqueueTrade(network, address, hash, user.address, slug))
      setRegistrationNotice(
        'Your trade was submitted, but its activity could not be recorded.',
      );
  }
  const [submittedHash, setSubmittedHash] = useState<string>();

  const buying = side === 'buy';
  const pair = tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol;
  const permitted =
    network === API_NETWORK &&
    !snapshot.state.busy &&
    (snapshot.status === 'Open' || (!buying && snapshot.status === 'Failed'));
  // Buy entries are pair amounts (what the trader spends); sell entries are token amounts.
  let spendNow: bigint | undefined;
  let inputError = '';
  try {
    if (entry) spendNow = parseAmount(entry);
  } catch (cause) {
    inputError = errorMessage(cause);
  }
  let spendQuoted: bigint | undefined;
  try {
    if (debouncedEntry) spendQuoted = parseAmount(debouncedEntry);
  } catch {
    /* Invalid input is explained above. */
  }
  const entryCurrent = spendNow !== undefined && spendNow === spendQuoted;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedEntry(entry), 350);
    return () => clearTimeout(timeout);
  }, [entry]);

  // Derive a budget-sized fill, then ask the contract for the authoritative quote.
  const quoteAmount = buying
    ? spendQuoted === undefined
      ? undefined
      : buyAmountForBudget(snapshot, spendQuoted)
    : spendQuoted;
  if (buying && entryCurrent && quoteAmount === BigInt(0))
    inputError = 'Enter a larger amount or check the remaining curve supply.';

  const quoteRead = useReadContracts(
    [
      {
        address,
        fn: buying ? 'quote_buy' : 'quote_sell',
        args: [quoteAmount?.toString() ?? '0'],
      },
    ],
    { network: NETWORK },
    {
      enabled:
        visible &&
        isReady &&
        permitted &&
        quoteAmount !== undefined &&
        quoteAmount > BigInt(0),
      refetchInterval: 15_000,
      retry: false,
    },
  );
  let quote: ReturnType<typeof decodeQuote> | undefined;
  let quoteError = '';
  try {
    if (
      quoteRead.data &&
      permitted &&
      quoteAmount !== undefined &&
      quoteAmount > BigInt(0) &&
      entryCurrent
    )
      quote = decodeQuote(quoteRead.data.values[0]);
  } catch (cause) {
    quoteError = errorMessage(cause);
  }
  // Quoted token amount. A buy may accept fewer tokens within its slippage floor.
  const amount = buying ? (entryCurrent ? quoteAmount : undefined) : spendNow;
  let slippageBps: bigint | undefined;
  let limitError = '';
  const slippage = limitEntry.trim() || '0.5';
  if (!/^\d+(\.\d{1,2})?$/.test(slippage)) {
    limitError = 'Enter a slippage percentage with up to 2 decimal places.';
  } else {
    const [whole, decimals = ''] = slippage.split('.');
    slippageBps = BigInt(whole) * BigInt(100) + BigInt(decimals.padEnd(2, '0'));
    if (slippageBps >= BigInt(10_000))
      limitError = 'Slippage must be between 0% and less than 100%.';
  }
  const minimumReceived = quote && amount !== undefined && slippageBps !== undefined && !limitError
    ? defaultLimit(buying ? amount : quote.user_amount, slippageBps)
    : undefined;
  // The buy budget already includes creator fees. Never add slippage to it.
  const limit = minimumReceived === undefined ? undefined : buying ? spendNow : minimumReceived;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      running.current ||
      locked ||
      !user ||
      amount === undefined ||
      limit === undefined ||
      minimumReceived === undefined ||
      limitError ||
      !quote ||
      !permitted
    )
      return;

    running.current = true;
    setLocked(true);
    setWorking(true);
    setError('');
    setConfirmation(undefined);
    setTrustHash(undefined);
    setSubmittedHash(undefined);
    setRegistrationNotice('');
    setDialogOpen(true);
    setMessage('Checking the current quote and your wallet…');

    let submittedHash: string | undefined;

    try {
      if (!StrKey.isValidEd25519PublicKey(user.address))
        throw new Error('Trading requires a connected Stellar account.');
      const fresh = await readContracts(
        [
          {
            address,
            fn: buying ? 'get_state' : 'quote_sell',
            args: buying ? [] : [amount.toString()],
          },
          // Only read the spending asset before trustline setup. Reading the
          // receiving SAC balance fails for a first-time trader with no trustline.
          {
            address: (buying ? tokens.pair : tokens.asset).contractId(NETWORK),
            fn: 'balance',
            args: [user.address],
          },
          ...(!buying
            ? [{ address, fn: 'sellable_balance', args: [user.address] }]
            : []),
        ],
        { network: NETWORK },
      );

      let executionAmount = amount;
      let current: ReturnType<typeof decodeQuote>;
      if (buying) {
        // The existing buy ABI takes a fixed token fill and a payment cap.
        // Recalculate that fill at the current curve state, keeping the budget fixed.
        executionAmount = buyAmountForBudget(
          { ...snapshot, state: decodeState(fresh.values[0]) },
          limit,
        );
        if (executionAmount <= BigInt(0) || executionAmount < minimumReceived)
          throw new Error(
            'The current buy would receive fewer than your minimum tokens. Refresh the quote.',
          );
        const freshQuote = await readContracts(
          [{ address, fn: 'quote_buy', args: [executionAmount.toString()] }],
          { network: NETWORK },
        );
        current = decodeQuote(freshQuote.values[0]);
      } else {
        current = decodeQuote(fresh.values[0]);
      }
      if (buying && current.user_amount > limit)
        throw new Error(
          'The price increased beyond your payment budget. Refresh the quote.',
        );
      if (!buying && current.user_amount < limit)
        throw new Error(
          'The price decreased below your minimum receipt. Refresh the quote.',
        );
      if (buying && integer(fresh.values[1]) < limit)
        throw new Error(
          `You need ${formatAmount(limit)} ${tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol} for this buy, plus XLM for fees and reserves.`,
        );
      if (
        !buying &&
        (integer(fresh.values[1]) < amount || integer(fresh.values[2]) < amount)
      )
        throw new Error(
          'You can only sell tokens you still hold and bought directly from this curve.',
        );
      const wallet = await ensureTradeTrustlines(
        user.address,
        tokens,
        buying,
        sendTransaction,
        (hash) => {
          setTrustHash(hash);
          setAwaitingApproval(false);
          setMessage('Trustline submitted. Waiting for confirmation…');
        },
        (stage) => {
          setAwaitingApproval(true);
          setMessage(stage);
        },
      );
      checkReceivingCapacity(
        wallet,
        tokens,
        buying,
        buying ? executionAmount : current.user_amount,
      );
      setAwaitingApproval(true);
      setMessage(`Approve the ${side} transaction in your wallet…`);
      const recordSubmission = (hash: string) => {
        if (submittedHash === hash) return;
        submittedHash = hash;
        queueHash(hash);
        setSubmittedHash(hash);
        setAwaitingApproval(false);
        setMessage('Trade submitted. Waiting for confirmation…');
      };
      const result = await recoverSubmittedTransaction(
        () => writeContract({
          call: {
            address,
            fn: side,
            args: [user.address, executionAmount.toString(), limit.toString()],
          },
          options: { network: NETWORK },
        }),
        recordSubmission,
      );
      recordSubmission(result.hash);

      await confirmTransaction(result.hash);
      setConfirmation({ hash: result.hash, side });
      setMessage(`${buying ? 'Buy' : 'Sell'} confirmed.`);
      setEntry('');
      setLimitEntry('');
      void refresh().catch(() => setError('Balances could not refresh.'));
    } catch (cause) {
      setError(
        friendlyError(
          cause,
          'The trade could not be completed. Refresh the quote and try again.',
        ),
      );
      setMessage('');
    } finally {
      setAwaitingApproval(false);
      running.current = false;
      setLocked(false);
      setWorking(false);
    }
  }

  const sellable = balances?.held !== undefined && balances.position !== undefined
    ? balances.held < balances.position
      ? balances.held
      : balances.position
    : undefined;
  const unavailable =
    snapshot.status === 'Graduated'
      ? 'Trading stops after graduation.'
      : snapshot.status === 'Scheduled'
        ? 'Trading opens at the launch start.'
        : buying && snapshot.status === 'Failed'
          ? 'The launch ended; only sell-back remains available.'
          : snapshot.state.busy
            ? 'The contract is busy.'
            : undefined;
  return {
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
    dismissConfirmation: () => {
      if (working && !confirmation && !submittedHash) return;
      setDialogOpen(false);
    },
    finishDialogClose: () => {
      if (dialogOpen) return;
      setError('');
      setConfirmation(undefined);
      setMessage('');
      setTrustHash(undefined);
      setSubmittedHash(undefined);
    },
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
  };
}
