'use client';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CircleCheck, CircleAlert, Wallet } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { tradeTransition } from '@/features/launches/trading/trade-transition';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { TransactionHash } from './transaction-hash';
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
  pendingHash,
  trustHash,
  registrationNotice,
  onCheckPending,
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
  pendingHash?: string | null;
  trustHash?: string;
  registrationNotice?: string;
  onCheckPending?: () => void;
}) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : tradeTransition;
  const busy = working && !confirmation;
  const title = confirmation
    ? confirmation.side === 'buy'
      ? 'Buy confirmed'
      : confirmation.side === 'sell'
        ? 'Sell confirmed'
        : 'Transaction confirmed'
    : busy
      ? awaitingApproval ? 'Approve in your wallet' : side === 'sell' ? 'Selling tokens' : 'Buying tokens'
      : pendingHash ? 'Confirmation pending' : 'Trade not completed';
  const hash = confirmation?.hash ?? pendingHash;
  const phase = confirmation ? 'success' : busy ? awaitingApproval ? 'approval' : 'processing' : pendingHash ? 'pending' : 'error';
  return (
    <Dialog
      open={open}
      // Blux approvals can live in a sibling iframe and must be able to receive focus.
      modal={!awaitingApproval}
      disablePointerDismissal={busy}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) onClosed?.();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-2xl p-0 data-open:duration-300 data-closed:duration-150 motion-reduce:animate-none"
      >
        <motion.div
          layout={reduced ? false : 'size'}
          transition={transition}
          className="flex min-h-[min(24rem,calc(100svh-2rem))] min-w-0 flex-col items-center justify-center gap-6 p-6 text-center sm:p-8"
        >
          <div className="relative grid size-20 shrink-0 place-items-center" aria-hidden="true">
            <AnimatePresence initial={false}>
              <motion.div
                key={phase}
                initial={reduced ? false : { opacity: 0, scale: 0.8, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.1 }}
                transition={transition}
                className={cn('absolute inset-0 grid place-items-center rounded-full',
                  confirmation ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}
              >
                {confirmation ? <CircleCheck className="size-9" />
                  : awaitingApproval ? <Wallet className="size-9" />
                    : busy ? <Spinner aria-hidden="true" className="size-9 motion-reduce:animate-none" />
                      : <CircleAlert className="size-9" />}
              </motion.div>
            </AnimatePresence>
          </div>
          <DialogHeader className="w-full items-center gap-3 text-center">
            <DialogTitle aria-live="polite" aria-atomic="true" className="text-title font-semibold leading-snug">
              <motion.span key={title} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="block">
                {title}
              </motion.span>
            </DialogTitle>
            <DialogDescription className="max-w-xs text-center leading-relaxed">
              {confirmation ? 'Your transaction is confirmed on Stellar Testnet.'
                : busy ? 'Follow the transaction progress here.'
                  : pendingHash ? 'Check this transaction before submitting another trade.'
                    : 'Review the message below before trying again.'}
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence initial={false} mode="wait">
            {!confirmation && (busy ? message : error) && (
              <motion.p
                key={busy ? message : error}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={transition}
                role={busy ? 'status' : 'alert'}
                aria-atomic="true"
                className="w-full break-words text-sm leading-relaxed"
              >
                {busy ? message : error}
              </motion.p>
            )}
          </AnimatePresence>
          {confirmation && error && (
            <p role="alert" className="text-sm text-muted-foreground">
              Your trade is confirmed, but balances could not refresh. Refresh the page to update them.
            </p>
          )}
          {(hash || (trustHash && !confirmation)) && (
            <motion.div layout={reduced ? false : 'position'} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={transition}
              className="flex min-w-0 flex-col items-center gap-2 [&_a]:text-small [&_a]:text-muted-foreground">
              {hash && <TransactionHash hash={hash} label="View transaction" compact />}
              {trustHash && !confirmation && <TransactionHash hash={trustHash} label="View trustline transaction" compact />}
            </motion.div>
          )}
          {registrationNotice && <p role="status" className="break-words text-sm text-muted-foreground">{registrationNotice}</p>}
          {!busy && (
            <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="flex w-full flex-col items-center gap-2">
              {pendingHash && !confirmation && onCheckPending && (
                <Button className="w-full" onClick={onCheckPending}>Check submitted trade</Button>
              )}
              <DialogClose render={<Button variant={pendingHash && !confirmation ? 'outline' : 'default'} className="w-full" />}>
                {confirmation ? 'Done' : 'Close'}
              </DialogClose>
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
