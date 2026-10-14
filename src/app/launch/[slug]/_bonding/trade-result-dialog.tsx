'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { TransactionHash } from './transaction-hash';
export type TradeConfirmation = { hash: string; side?: 'buy' | 'sell' };
export function TradeResultDialog({
  confirmation,
  onClose,
}: {
  confirmation?: TradeConfirmation;
  onClose: () => void;
}) {
  const title =
    confirmation?.side === 'buy'
      ? 'Buy confirmed'
      : confirmation?.side === 'sell'
        ? 'Sell confirmed'
        : 'Transaction confirmed';
  return (
    <Dialog
      open={!!confirmation}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-2xl motion-reduce:animate-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Your transaction is confirmed on Stellar Testnet.
          </DialogDescription>
        </DialogHeader>
        {confirmation && (
          <div className="min-w-0 rounded-xl bg-muted p-3">
            <TransactionHash
              hash={confirmation.hash}
              label="Trade transaction"
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button className="w-full" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
