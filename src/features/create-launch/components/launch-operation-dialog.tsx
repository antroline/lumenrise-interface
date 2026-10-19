'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, CircleAlert, LoaderCircle, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';
import { AppDialogContent, AppDialogHeader, AppDialogFooter } from '@/components/app-dialog';
import { cn } from '@/lib/utils';
import type { LaunchOperation, LaunchOperationStep } from '../lib/launch-operation';

// Issuance is signed by the temporary issuer; only these actions need the wallet.
const signatureSteps = [
  { id: 'setup', title: 'Set up token', detail: 'Fund the issuer and add your trustline.' },
  { id: 'deploy', title: 'Deploy token contract', detail: 'Approve the token contract deployment.' },
  { id: 'curve', title: 'Create launch', detail: 'Create the curve and transfer the token supply.' },
] as const;

const operationOrder: LaunchOperationStep[] = [
  'check', 'logo', 'setup', 'issue', 'deploy', 'curve', 'index',
];

export function LaunchOperationDialog({
  operation, name, symbol, logo, open, onOpenChange, onRetry,
}: {
  operation: LaunchOperation | null;
  name: string;
  symbol: string;
  logo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  if (!operation) return null;
  const failed = operation.status === 'error';
  const success = operation.status === 'success';
  const approval = !failed && !success && operation.phase === 'approval';
  const currentIndex = operationOrder.indexOf(operation.step);
  const activeSignature = signatureSteps.find((step) => step.id === operation.step);
  const title = success ? 'Your launch is ready' : failed ? 'Launch paused' : 'Launching your token';
  const status = success
    ? 'Your project page is ready.'
    : failed
      ? operation.message
      : approval
        ? 'Review and sign in your wallet.'
        : operation.step === 'index'
          ? 'Finalizing your launch…'
          : operation.phase === 'confirming'
            ? 'Confirming on Stellar…'
            : 'Preparing your launch…';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Blux opens its approval UI in a sibling iframe; allow it to receive focus.
      modal={!approval}
      disablePointerDismissal
    >
      <AppDialogContent>
        <AppDialogHeader
          title={title}
          description={<>{name.trim() || symbol || 'Your token'}{name.trim() && symbol ? ` · ${symbol}` : ''}</>}
          descriptionTitle={name || symbol}
          truncateDescription
          leading={
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={logo || undefined} alt="" />
              <AvatarFallback>{(symbol || name).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          }
        />

        {!success && (
          <ol className="flex flex-col gap-1" aria-label="Wallet signatures">
            {signatureSteps.map((step, index) => {
              const active = operation.step === step.id;
              const done = operationOrder.indexOf(step.id) < currentIndex;
              const signing = active && approval;
              const Icon = done ? Check : active && failed ? CircleAlert : signing ? Wallet : active ? LoaderCircle : null;
              const hash = operation.transactionHashes?.[step.id] ?? (active ? operation.hash : undefined);
              return (
                <li
                  key={step.id}
                  aria-current={active ? 'step' : undefined}
                  className={cn('flex min-w-0 items-start gap-3 rounded-lg p-2', active && 'bg-secondary/70')}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums',
                      done ? 'bg-primary text-primary-foreground' : active && failed ? 'bg-destructive/10 text-destructive' : active ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {Icon ? <Icon className={cn('size-3.5', active && !failed && !approval && open && 'animate-spin motion-reduce:animate-none')} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-medium', !done && !active && 'text-muted-foreground')}>{step.title}</p>
                      <span className="sr-only">{done ? 'Complete' : active ? failed ? 'Needs attention' : signing ? 'Awaiting signature' : 'Processing' : 'Pending'}</span>
                      {hash && (
                        <Link
                          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View transaction for ${step.title}`}
                          className="-my-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    {signing && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div
          role={failed ? 'alert' : 'status'}
          aria-atomic="true"
          className={cn('flex items-start gap-2 text-sm leading-relaxed', failed ? 'text-destructive' : 'text-muted-foreground')}
        >
          {failed ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            : success ? <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
              : approval ? <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                : <LoaderCircle className={cn('mt-0.5 size-4 shrink-0', open && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />}
          <p className="min-w-0 break-words">
            {approval && activeSignature && <span className="sr-only">{activeSignature.title}. </span>}
            {status}
          </p>
        </div>

        {(failed || success) && (
          <AppDialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            {failed && <Button onClick={onRetry}>Check / retry</Button>}
            {success && operation.curveAddress && (
              <Link href={`/launch/${operation.curveAddress}`} className={cn(buttonVariants(), 'min-w-0')}>
                View launch <ArrowUpRight data-icon="inline-end" />
              </Link>
            )}
          </AppDialogFooter>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
