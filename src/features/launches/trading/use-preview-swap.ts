'use client';
import { useState } from 'react';
import { useLaunchpad } from '@/lib/launchpad';
import { parseAmount } from './parse-preview-amount';
import { formatAmount } from './format-preview-amount';
import { XLM_BALANCE, XLM_PER_TOKEN, XLM_USD, type Slippage } from '../data/trading';
const TOKEN_BALANCE = 0;
export function usePreviewSwap(slug: string, ticker: string, priceUsd: number) {
  const { isSignedIn, login, loginPending, notify } = useLaunchpad();
  const [payAmount, setPayAmount] = useState('500');
  const [selling, setSelling] = useState(false);
  const [slippage, setSlippage] = useState<Slippage>('0.5');
  const payToken = selling ? ticker : 'XLM';
  const receiveToken = selling ? 'XLM' : ticker;
  const payBalance = selling ? TOKEN_BALANCE : XLM_BALANCE;
  const amount = parseAmount(payAmount);
  const receive =
    Number.isFinite(amount) && amount > 0
      ? selling
        ? amount * XLM_PER_TOKEN
        : amount / XLM_PER_TOKEN
      : 0;
  const payUsd =
    Number.isFinite(amount) && amount > 0
      ? amount * (selling ? priceUsd : XLM_USD)
      : 0;
  const receiveUsd = receive * (selling ? XLM_USD : priceUsd);
  const minimumReceived = receive * (1 - Number(slippage) / 100);
  const error =
    !Number.isFinite(amount) || amount <= 0
      ? 'Enter an amount'
      : amount > payBalance
        ? `Insufficient ${payToken} balance`
        : null;
  const submit = () => {
    if (!isSignedIn) {
      void login(`/trade/${slug}`);
      return;
    }
    if (error) return;
    notify(
      `Review swap: ${payAmount} ${payToken} → ~${formatAmount(receive)} ${receiveToken}. Swaps are not connected to a backend in this preview.`,
    );
  };
  const flip = () => {
    setSelling((current) => !current);
    setPayAmount(receive > 0 ? String(Math.round(receive * 100) / 100) : '');
  };
  return {
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
  };
}
