'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TokenLogo } from '@/components/token-logo';
import { Check, CircleAlert } from 'lucide-react';
import { formatAmount } from '@/lib/stellar/amount';
import { formatBaseAmount } from '@/lib/base/amount';
import { cn } from '@/lib/utils';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/app-dialog';
import { TransactionHash } from './transaction-hash';
import styles from './trade-result-dialog.module.css';

export type TradeConfirmation = {
  hash: string;
  side?: 'buy' | 'sell';
  /** The submitted token quantity; supported SAC assets use seven decimals. */
  token?: { symbol: string; amount: bigint; decimals?: number };
};

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
  tokenLogo,
  tokenSeed,
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
  tokenLogo?: string;
  tokenSeed?: string;
}) {
  const busy = working && !confirmation;
  const approval = busy && awaitingApproval;
  const dismissible = !busy || !!submittedHash;
  const failed = !busy && !confirmation;
  const confirmedSide = confirmation?.side ?? side;
  const title = confirmation
    ? confirmedSide === 'buy' ? 'Buy confirmed' : confirmedSide === 'sell' ? 'Sell confirmed' : 'Transaction confirmed'
    : busy ? approval ? 'Approve in your wallet' : 'Completing transaction' : 'Trade not completed';
  const description = confirmation
    ? 'Your transaction was successful.'
    : busy ? approval ? 'Open your wallet and approve the transaction to continue.' : 'Your transaction is being processed.'
      : error || 'The trade could not be completed. Please try again.';
  const hash = confirmation?.hash ?? submittedHash;
  const hasExplorerAction = !busy && !!hash;

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
      <AppDialogContent
        showCloseButton={dismissible}
        animateSize={false}
        className={cn(styles.status, failed && styles.failed, 'border border-border ring-0')}
      >
        <div className={cn('flex min-w-0 flex-col items-center justify-center text-center', failed ? 'gap-3 pt-7' : confirmation ? 'min-h-[270px] gap-4' : 'min-h-[210px] gap-4')}>
          <div aria-hidden="true" className={cn(
            'grid shrink-0 place-items-center rounded-full',
            busy ? 'size-14 bg-ink text-primary' : confirmation ? 'size-16 bg-primary text-primary-foreground' : 'size-13 bg-bad-soft text-bad',
          )}>
            {busy
              ? <Spinner aria-hidden="true" role={undefined} aria-label={undefined} className="size-11 motion-reduce:animate-none" />
              : confirmation ? <Check className="size-9" /> : <CircleAlert className="size-8" />}
          </div>
          <DialogHeader className="w-full items-center gap-2 pr-0! text-center">
            <DialogTitle aria-live="polite" aria-atomic="true" className={cn('font-semibold leading-snug tracking-tight', failed ? 'text-xl' : 'text-2xl')}>
              <span>{title}</span>
            </DialogTitle>
            <DialogDescription
              role={busy ? 'status' : failed ? 'alert' : undefined}
              aria-atomic="true"
              className={cn('w-full break-words leading-5 text-muted-foreground', failed ? 'text-xs' : 'text-sm')}
            >
              {description}
            </DialogDescription>
          </DialogHeader>
          {confirmation?.token && <div className="grid w-full min-w-0 grid-cols-2 items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2.5 text-left">
              <span className="size-9 shrink-0 overflow-hidden rounded-xl">
                <TokenLogo logo={tokenLogo} name={confirmation.token.symbol} seed={tokenSeed || confirmation.token.symbol} size={36} />
              </span>
              <div className="min-w-0">
                <p title={confirmation.token.symbol} className="truncate text-sm font-semibold leading-5">{confirmation.token.symbol}</p>
                <p className="text-xs leading-4 text-muted-foreground">{confirmedSide === 'buy' ? 'Purchased' : confirmedSide === 'sell' ? 'Sold' : 'Amount'}</p>
              </div>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-xs leading-4 text-muted-foreground">Amount:</p>
              <p className="mt-1 break-all text-sm font-semibold leading-5 tabular-nums sm:text-base sm:leading-6">{formatSummaryAmount(confirmation.token.amount, confirmation.token.decimals)}</p>
            </div>
          </div>}
          {busy && message && <p role="status" className="sr-only">{message}</p>}
          {trustHash && !confirmation && <TransactionHash hash={trustHash} label="View trustline transaction" compact className="h-11! rounded-xl border-border bg-background text-sm font-semibold" />}
          {confirmation && error && <p role="alert" className="w-full break-words text-sm leading-5 text-muted-foreground">
            Your trade is confirmed, but balances could not refresh. Refresh the page to update them.
          </p>}
          {registrationNotice && <p role="status" className="w-full break-words text-sm leading-5 text-muted-foreground">{registrationNotice}</p>}
          {!busy && <div className={cn('grid w-full min-w-0 gap-3', failed && 'mt-3', hasExplorerAction && 'grid-cols-2')}>
            {hasExplorerAction && <TransactionHash hash={hash} label="See in explorer" compact className="h-11! gap-1.5 whitespace-normal rounded-xl border-border bg-background px-2 text-xs font-semibold leading-4 sm:text-sm" />}
            <DialogClose render={<Button type="button" className={failed ? 'h-9! w-full rounded-lg px-5 text-xs font-semibold' : 'h-11! w-full rounded-xl px-4 text-xs font-semibold sm:text-sm'} />}>
              {confirmation ? 'Done' : 'Close'}
            </DialogClose>
          </div>}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}

function formatSummaryAmount(amount: bigint, decimals?: number) {
  const [whole, fraction = ''] = (decimals === undefined ? formatAmount(amount, 3) : formatBaseAmount(amount, decimals, 3)).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(3, '0')}`;
}
