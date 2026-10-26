'use client';

import { API_NETWORK } from '@/lib/stellar/network';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Check, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/app-dialog';
import { TransactionHash } from './transaction-hash';
import styles from './trade-result-dialog.module.css';

export type TradeConfirmation = { hash: string; side?: 'buy' | 'sell' };

export function TradeResultDialog({
  confirmation,
  onClose,
  onClosed,
  open = !!confirmation,
  working = false,
  awaitingApproval = false,
  side,
  message,
  error,
  submittedHash,
  trustHash,
  registrationNotice,
}: {
  confirmation?: TradeConfirmation;
  onClose: () => void;
  onClosed?: () => void;
  open?: boolean;
  working?: boolean;
  awaitingApproval?: boolean;
  side?: 'buy' | 'sell';
  message?: string;
  error?: string;
  submittedHash?: string;
  trustHash?: string;
  registrationNotice?: string;
}) {
  const busy = working && !confirmation;
  const dismissible = !busy || !!submittedHash;
  const failed = !busy && !confirmation;
  const title = confirmation
    ? confirmation.side === 'buy'
      ? 'Buy confirmed'
      : confirmation.side === 'sell'
        ? 'Sell confirmed'
        : 'Transaction confirmed'
    : busy
      ? awaitingApproval
        ? 'Approve in your wallet'
        : side === 'sell'
          ? 'Completing sale transaction'
          : 'Completing purchase transaction'
      : 'Trade not completed';
  const description = confirmation
    ? `Your transaction is confirmed on Stellar ${API_NETWORK === 'public' ? 'Mainnet' : 'Testnet'}.`
    : busy
      ? message || (awaitingApproval
        ? 'Approve the transaction in your wallet to continue.'
        : 'Waiting for the transaction to complete.')
      : error || 'The trade could not be completed. Please try again.';
  const hash = confirmation?.hash ?? submittedHash;

  return (
    <Dialog
      open={open}
      // Blux approvals can live in a sibling iframe and must be able to receive focus.
      modal={!awaitingApproval}
      disablePointerDismissal={!dismissible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && dismissible) onClose();
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClosed?.();
      }}
    >
      <AppDialogContent presentation="centered" showCloseButton={false} className={styles.popup}>
        <div className={cn(
          'flex min-w-0 flex-col items-center text-center',
          busy ? 'min-h-40 justify-center gap-5' : 'gap-4 pt-4',
        )}>
          <div aria-hidden="true" className={cn(
            'grid shrink-0 place-items-center rounded-full',
            busy ? 'size-12 bg-secondary text-foreground'
              : confirmation ? 'size-8 bg-primary text-primary-foreground'
                : 'size-8 bg-bad-soft text-bad',
          )}>
            {busy ? <Spinner aria-hidden="true" role={undefined} aria-label={undefined} className="size-6 motion-reduce:animate-none" />
              : confirmation ? <Check className="size-5" />
                : <CircleAlert className="size-5" />}
          </div>
          <DialogHeader className="w-full items-center gap-2 pr-0! text-center">
            <DialogTitle aria-live="polite" aria-atomic="true" className="text-balance text-lg font-semibold leading-snug tracking-tight">
              <span>{title}</span>
            </DialogTitle>
            <DialogDescription
              role={busy ? 'status' : failed ? 'alert' : undefined}
              aria-atomic="true"
              className={cn('w-full break-words text-[13px] leading-5', confirmation && 'sr-only', failed && 'text-bad')}
            >
              {description}
            </DialogDescription>
          </DialogHeader>

          {!busy && hash && (
            <div className="flex w-full min-w-0 flex-col gap-3">
              <p
                title={hash}
                aria-label={`Transaction hash: ${hash}`}
                className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground tabular-nums"
              >
                <span dir="ltr" className="block truncate">
                  {hash.length > 28 ? `${hash.slice(0, 12)}…${hash.slice(-12)}` : hash}
                </span>
              </p>
              <TransactionHash hash={hash} label="See in explorer" compact />
            </div>
          )}
          {trustHash && !confirmation && (
            <TransactionHash hash={trustHash} label="View trustline transaction" compact />
          )}
          {confirmation && error && (
            <p role="alert" className="text-xs leading-5 text-muted-foreground">
              Your trade is confirmed, but balances could not refresh. Refresh the page to update them.
            </p>
          )}
          {registrationNotice && (
            <p role="status" className="w-full break-words text-xs leading-5 text-muted-foreground">
              {registrationNotice}
            </p>
          )}
          {dismissible && (
            <div className="flex w-full items-center justify-end gap-2 pt-1">
              <DialogClose render={<Button type="button" className="h-11 min-w-20 px-4" />}>
                {confirmation ? 'Done' : 'Close'}
              </DialogClose>
            </div>
          )}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
