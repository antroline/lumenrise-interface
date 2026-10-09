'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { readContracts, useBlux, useReadContracts, useWriteContract } from '@bluxcc/react';
import { StrKey } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NETWORK, soroban } from '@/app/create/_launch/transactions';
import {
  decodeQuote, defaultLimit, errorMessage, formatAmount, integer, parseAmount,
  type Snapshot, type Tokens,
} from './contract';
import { checkReceivingCapacity, confirmTransaction, ensureTradeTrustlines } from './trade';

type Props = {
  address: string;
  snapshot: Snapshot;
  tokens: Tokens;
  side: 'buy' | 'sell';
  locked: boolean;
  setLocked: (value: boolean) => void;
  refresh: () => Promise<void>;
};

export function TradeForm({ address, snapshot, tokens, side, locked, setLocked, refresh }: Props) {
  const { user, isReady, sendTransaction } = useBlux();
  const { mutateAsync: writeContract } = useWriteContract();
  const [entry, setEntry] = useState('');
  const [debouncedEntry, setDebouncedEntry] = useState('');
  const [limitEntry, setLimitEntry] = useState('');
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hash, setHash] = useState<string>();
  const [trustHash, setTrustHash] = useState<string>();
  const pendingKey = user ? `launchpad:pending-trade:${NETWORK}:${address}:${user.address}` : undefined;
  const [pendingHash, setPendingHash] = useState(() => {
    if (!pendingKey) return null;
    try { return localStorage.getItem(pendingKey); } catch { return null; }
  });
  const buying = side === 'buy';
  const permitted = !snapshot.state.busy && (snapshot.status === 'Open' || (!buying && snapshot.status === 'Failed'));
  let amount: bigint | undefined;
  let inputError = '';
  try { if (entry) amount = parseAmount(entry); } catch (cause) { inputError = errorMessage(cause); }
  let quoteAmount: bigint | undefined;
  try { if (debouncedEntry) quoteAmount = parseAmount(debouncedEntry); } catch { /* Invalid input is explained above. */ }

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedEntry(entry), 350);
    return () => clearTimeout(timeout);
  }, [entry]);

  const quoteRead = useReadContracts(
    [{ address, fn: buying ? 'quote_buy' : 'quote_sell', args: [quoteAmount?.toString() ?? '0'] }],
    { network: NETWORK },
    { enabled: isReady && permitted && quoteAmount !== undefined, refetchInterval: 15_000, retry: false },
  );
  let quote: ReturnType<typeof decodeQuote> | undefined;
  let quoteError = '';
  try {
    if (quoteRead.data && amount === quoteAmount) quote = decodeQuote(quoteRead.data.values[0]);
  } catch (cause) { quoteError = errorMessage(cause); }
  const suggestedLimit = quote ? defaultLimit(quote.user_amount, buying) : undefined;
  let limit: bigint | undefined;
  let limitError = '';
  try { limit = limitEntry ? parseAmount(limitEntry, !buying) : suggestedLimit; }
  catch (cause) { limitError = errorMessage(cause); }
  if (limit !== undefined && quote && (buying ? limit < quote.user_amount : limit > quote.user_amount))
    limitError = buying ? 'Maximum payment is below the current quote.' : 'Minimum receipt is above the current quote.';

  async function recoverPending() {
    if (!pendingKey || locked || running.current) return;
    running.current = true;
    setLocked(true);
    setWorking(true);
    setError('');
    try {
      const pending = localStorage.getItem(pendingKey);
      if (!pending) { setPendingHash(null); return; }
      setHash(pending);
      setMessage('Checking your submitted trade…');
      const result = await soroban.getTransaction(pending);
      if (result.status === 'FAILED') {
        localStorage.removeItem(pendingKey);
        setPendingHash(null);
        throw new Error('The submitted trade failed on-chain. You can request a new quote and retry.');
      }
      await confirmTransaction(pending);
      localStorage.removeItem(pendingKey);
      setPendingHash(null);
      setMessage('Your submitted trade is confirmed. Balances refreshed.');
      await refresh();
    } catch (cause) { setError(errorMessage(cause)); setMessage(''); }
    finally { running.current = false; setLocked(false); setWorking(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || locked || !user || !pendingKey || amount === undefined || limit === undefined || limitError || !quote || !permitted) return;
    running.current = true;
    setLocked(true);
    setWorking(true);
    setError('');
    setMessage('Checking the current quote and your wallet…');
    let submittedHash: string | undefined;
    try {
      if (!StrKey.isValidEd25519PublicKey(user.address)) throw new Error('Trading requires a connected Stellar account.');
      // Resolve a previous submission before creating another transaction. Persist
      // immediately after submission so reloads cannot accidentally repeat a trade.
      const pending = localStorage.getItem(pendingKey);
      if (pending) {
        setHash(pending);
        setPendingHash(pending);
        await confirmTransaction(pending);
        localStorage.removeItem(pendingKey);
        setPendingHash(null);
        setMessage('Your previous trade is confirmed. Balances refreshed; submit again for a new trade.');
        await refresh();
        return;
      }
      const fresh = await readContracts([
        { address, fn: buying ? 'quote_buy' : 'quote_sell', args: [amount.toString()] },
        { address: tokens.asset.contractId(NETWORK), fn: 'balance', args: [user.address] },
        { address: tokens.pair.contractId(NETWORK), fn: 'balance', args: [user.address] },
        { address, fn: 'sellable_balance', args: [user.address] },
      ], { network: NETWORK });
      const current = decodeQuote(fresh.values[0]);
      if (buying && current.user_amount > limit) throw new Error('The price increased beyond your maximum payment. Refresh the quote.');
      if (!buying && current.user_amount < limit) throw new Error('The price decreased below your minimum receipt. Refresh the quote.');
      if (buying && integer(fresh.values[2]) < current.user_amount) throw new Error(`You need ${formatAmount(current.user_amount)} ${tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol} for this buy, plus XLM for fees and reserves.`);
      if (!buying && (integer(fresh.values[1]) < amount || integer(fresh.values[3]) < amount))
        throw new Error('You can only sell tokens you still hold and bought directly from this curve.');
      const wallet = await ensureTradeTrustlines(user.address, tokens, buying, sendTransaction, setTrustHash, setMessage);
      checkReceivingCapacity(wallet, tokens, buying, buying ? amount : current.user_amount);
      setMessage(`Approve the ${side} transaction in your wallet…`);
      const result = await writeContract({
        call: { address, fn: side, args: [user.address, amount.toString(), limit.toString()] },
        options: { network: NETWORK },
      });
      submittedHash = result.hash;
      setHash(result.hash);
      setPendingHash(result.hash);
      localStorage.setItem(pendingKey, result.hash);
      setMessage('Trade submitted. Waiting for confirmation…');
      await confirmTransaction(result.hash);
      localStorage.removeItem(pendingKey);
      setPendingHash(null);
      setMessage(`${buying ? 'Buy' : 'Sell'} confirmed.`);
      setEntry('');
      setLimitEntry('');
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setMessage('');
      // A definitively failed trade can be retried. Keep unresolved hashes.
      try {
        const pending = submittedHash ?? localStorage.getItem(pendingKey);
        if (pending) {
          const result = await soroban.getTransaction(pending);
          if (result.status === 'FAILED') {
            localStorage.removeItem(pendingKey);
            setPendingHash(null);
          }
        }
      } catch { /* Keep the pending hash when RPC or storage is unavailable. */ }
    } finally {
      running.current = false;
      setLocked(false);
      setWorking(false);
    }
  }

  const pair = tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol;
  const unavailable = snapshot.status === 'Graduated' ? 'Trading stops after graduation.'
    : snapshot.status === 'Scheduled' ? 'Trading opens at the launch start.'
      : buying && snapshot.status === 'Failed' ? 'The launch ended; only sell-back remains available.'
        : snapshot.state.busy ? 'The contract is busy.' : undefined;
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
      <h3 className="text-lg font-semibold">{buying ? 'Buy' : 'Sell'} {tokens.assetSymbol}</h3>
      <FieldGroup>
        <Field data-invalid={!!inputError}>
          <FieldLabel htmlFor={`${side}-amount`}>{tokens.assetSymbol} amount</FieldLabel>
          <Input id={`${side}-amount`} inputMode="decimal" value={entry} disabled={locked || !permitted}
            aria-invalid={!!inputError} onChange={event => { setEntry(event.target.value); setLimitEntry(''); }} placeholder="0.0" />
          <FieldDescription>{buying ? `Choose how many tokens to buy. Payment uses only ${pair}.` : 'Only your net purchases from this curve can be sold back.'}</FieldDescription>
          {inputError && <p role="alert" className="text-sm text-destructive">{inputError}</p>}
        </Field>
        <Field data-invalid={!!limitError}>
          <FieldLabel htmlFor={`${side}-limit`}>{buying ? 'Maximum payment' : 'Minimum receipt'} ({pair})</FieldLabel>
          <Input id={`${side}-limit`} inputMode="decimal" value={limitEntry} disabled={locked || !permitted}
            aria-invalid={!!limitError} onChange={event => setLimitEntry(event.target.value)}
            placeholder={suggestedLimit === undefined ? 'Enter amount first' : formatAmount(suggestedLimit)} />
          <FieldDescription>Leave blank to use the current quote with a 0.5% slippage allowance. This limit is passed to the contract.</FieldDescription>
          {limitError && <p role="alert" className="text-sm text-destructive">{limitError}</p>}
        </Field>
      </FieldGroup>
      {quote && <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
        <dt>Curve amount</dt><dd>{formatAmount(quote.gross)} {pair}</dd>
        <dt>Creator fee</dt><dd>{formatAmount(quote.creator_fee)} {pair}</dd>
        <dt>{buying ? 'Total payment' : 'Net receipt'}</dt><dd>{formatAmount(quote.user_amount)} {pair}</dd>
        <dt>{buying ? 'Payment cap' : 'Receipt floor'}</dt><dd>{limit === undefined ? 'Invalid amount' : `${formatAmount(limit)} ${pair}`}</dd>
      </dl>}
      {quoteRead.isFetching && entry && <p role="status" className="text-sm text-muted-foreground">Updating quote…</p>}
      {(quoteRead.error || quoteError) && <p role="alert" className="break-words text-sm text-destructive">Quote unavailable: {quoteError || errorMessage(quoteRead.error)}</p>}
      {unavailable && <p className="text-sm text-muted-foreground">{unavailable}</p>}
      <Button type="submit" disabled={!user || !isReady || locked || !!pendingHash || !permitted || !quote || !!quoteRead.error || !!limitError || limit === undefined}>
        {working ? 'Processing…' : `${buying ? 'Buy' : 'Sell'} ${tokens.assetSymbol}`}
      </Button>
      {pendingHash && <>
        <p className="break-all text-sm">A submitted trade needs confirmation: {pendingHash}</p>
        <Button type="button" variant="outline" disabled={locked || !isReady} onClick={() => void recoverPending()}>Check submitted trade</Button>
      </>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {trustHash && <TransactionHash hash={trustHash} label="Trustline transaction" />}
      {hash && <TransactionHash hash={hash} label="Trade transaction" />}
    </form>
  );
}

function TransactionHash({ hash, label }: { hash: string; label: string }) {
  return <a className="break-all text-sm underline underline-offset-4" target="_blank" rel="noreferrer"
    href={`https://stellar.expert/explorer/testnet/tx/${hash}`}>{label}: {hash}</a>;
}
