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
  soroban,
} from '@/lib/stellar/clients';
import { enqueueTrade } from '@/lib/api/launches/trade-queue';
import { usePageVisible } from '@/features/launches/hooks/queries';
import {
  decodeQuote,
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
  const { mutateAsync: writeContract } = useWriteContract();
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
        'Your trade was submitted, but this browser cannot save its registration across reloads. Keep the transaction hash until it is recorded.',
      );
  }
  const pendingKey = user
    ? `launchpad:pending-trade:${NETWORK}:${address}:${user.address}`
    : undefined;
  const [pendingHash, setPendingHash] = useState(() => {
    if (!pendingKey) return null;
    try {
      return localStorage.getItem(pendingKey);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (pendingHash && user)
      enqueueTrade(network, address, pendingHash, user.address, slug);
  }, [pendingHash, user, network, address, slug]);
  function readPending() {
    try {
      return pendingKey
        ? (localStorage.getItem(pendingKey) ?? pendingHash)
        : pendingHash;
    } catch {
      return pendingHash;
    }
  }
  function savePending(value: string | null) {
    if (!pendingKey) return;
    try {
      if (value) localStorage.setItem(pendingKey, value);
      else localStorage.removeItem(pendingKey);
    } catch {
      setRegistrationNotice(
        'Browser storage is unavailable. Keep the transaction hash until its confirmation and registration are complete.',
      );
    }
  }
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
  // Token amount bought or sold. Buys submit the budget-sized token amount.
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
  const limit = quote && slippageBps !== undefined && !limitError
    ? defaultLimit(quote.user_amount, buying, slippageBps)
    : undefined;
  const minimumReceived = buying ? amount : limit;

  async function recoverPending() {
    if (!pendingKey || locked || running.current) return;
    running.current = true;
    setLocked(true);
    setWorking(true);
    setError('');
    try {
      const pending = readPending();
      if (!pending) {
        setPendingHash(null);
        return;
      }
      setConfirmation(undefined);
      setTrustHash(undefined);
      setDialogOpen(true);
      queueHash(pending);
      setMessage('Checking your submitted trade…');
      const result = await soroban.getTransaction(pending);
      if (result.status === 'FAILED') {
        savePending(null);
        setPendingHash(null);
        throw new Error(
          'The submitted trade failed on-chain. You can request a new quote and retry.',
        );
      }
      await confirmTransaction(pending);
      setConfirmation({ hash: pending });
      savePending(null);
      setPendingHash(null);
      setMessage('Your submitted trade is confirmed. Balances refreshed.');
      await refresh();
    } catch (cause) {
      setError(
        friendlyError(cause, 'Could not check the submitted trade. Try again.'),
      );
      setMessage('');
    } finally {
      setAwaitingApproval(false);
      running.current = false;
      setLocked(false);
      setWorking(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      running.current ||
      locked ||
      !user ||
      !pendingKey ||
      amount === undefined ||
      limit === undefined ||
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
    setDialogOpen(true);
    setMessage('Checking the current quote and your wallet…');
    let submittedHash: string | undefined;
    try {
      if (!StrKey.isValidEd25519PublicKey(user.address))
        throw new Error('Trading requires a connected Stellar account.');
      // Resolve a previous submission before creating another transaction. Persist
      // immediately after submission so reloads cannot accidentally repeat a trade.
      const pending = readPending();
      if (pending) {
        queueHash(pending);
        setPendingHash(pending);
        await confirmTransaction(pending);
        setConfirmation({ hash: pending });
        savePending(null);
        setPendingHash(null);
        setMessage(
          'Your previous trade is confirmed. Balances refreshed; submit again for a new trade.',
        );
        await refresh();
        return;
      }
      const fresh = await readContracts(
        [
          {
            address,
            fn: buying ? 'quote_buy' : 'quote_sell',
            args: [amount.toString()],
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
      const current = decodeQuote(fresh.values[0]);
      if (buying && current.user_amount > limit)
        throw new Error(
          'The price increased beyond your maximum payment. Refresh the quote.',
        );
      if (!buying && current.user_amount < limit)
        throw new Error(
          'The price decreased below your minimum receipt. Refresh the quote.',
        );
      if (buying && integer(fresh.values[1]) < current.user_amount)
        throw new Error(
          `You need ${formatAmount(current.user_amount)} ${tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol} for this buy, plus XLM for fees and reserves.`,
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
        buying ? amount : current.user_amount,
      );
      setAwaitingApproval(true);
      setMessage(`Approve the ${side} transaction in your wallet…`);
      const result = await writeContract({
        call: {
          address,
          fn: side,
          args: [user.address, amount.toString(), limit.toString()],
        },
        options: { network: NETWORK },
      });
      setAwaitingApproval(false);
      submittedHash = result.hash;
      queueHash(result.hash);
      setPendingHash(result.hash);
      savePending(result.hash);
      setMessage('Trade submitted. Waiting for confirmation…');
      await confirmTransaction(result.hash);
      setConfirmation({ hash: result.hash, side });
      savePending(null);
      setPendingHash(null);
      setMessage(`${buying ? 'Buy' : 'Sell'} confirmed.`);
      setEntry('');
      setLimitEntry('');
      await refresh();
    } catch (cause) {
      setError(
        friendlyError(
          cause,
          'The trade could not be completed. Refresh the quote and try again.',
        ),
      );
      setMessage('');
      // A definitively failed trade can be retried. Keep unresolved hashes.
      try {
        const pending = submittedHash ?? readPending();
        if (pending) {
          const result = await soroban.getTransaction(pending);
          if (result.status === 'FAILED') {
            savePending(null);
            setPendingHash(null);
          }
        }
      } catch {
        /* Keep the pending hash when RPC or storage is unavailable. */
      }
    } finally {
      setAwaitingApproval(false);
      running.current = false;
      setLocked(false);
      setWorking(false);
    }
  }

  const sellable = balances
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
      if (working && !confirmation) return;
      setDialogOpen(false);
    },
    finishDialogClose: () => {
      if (dialogOpen) return;
      setError('');
      setConfirmation(undefined);
      setMessage('');
      setTrustHash(undefined);
    },
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
  };
}
