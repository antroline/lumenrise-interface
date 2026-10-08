'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, CircleAlert, LoaderCircle, Radio, Wallet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { LaunchOperation, LaunchOperationStep } from '../_launch/launch-operation';
import { launchTransition, useLaunchReducedMotion } from './launch-motion';

const steps: { id: LaunchOperationStep; title: string }[] = [
  { id: 'check', title: 'Check launch settings' },
  { id: 'setup', title: 'Set up issuer & trustline' },
  { id: 'issue', title: 'Issue token supply' },
  { id: 'deploy', title: 'Deploy token contract' },
  { id: 'curve', title: 'Create bonding curve' },
];

export function LaunchOperationDialog({
  operation,
  name,
  open,
  onOpenChange,
  onRetry,
}: {
  operation: LaunchOperation | null;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}) {
  const reduced = useLaunchReducedMotion();
  if (!operation) return null;
  const currentIndex = steps.findIndex((step) => step.id === operation.step);
  const success = operation.status === 'success';
  const failed = operation.status === 'error';
  const approval = !failed && !success && operation.phase === 'approval';
  const transition = reduced ? { duration: 0 } : launchTransition;
  const focalTransition = reduced ? { duration: 0 } : { ...launchTransition, duration: 0.32 };
  const title = success ? 'Your launch is ready'
    : failed ? 'Launch paused' : 'Launching your token';
  const activeLabel = failed ? 'Needs attention'
    : approval ? 'Awaiting approval'
      : operation.phase === 'confirming' ? 'Confirming on Stellar' : 'In progress';
  const statusLabel = success ? 'Complete' : activeLabel;
  const StatusIcon = success ? Check : failed ? CircleAlert
    : approval ? Wallet : operation.phase === 'confirming' ? Radio : LoaderCircle;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Blux can open its approval UI in a sibling iframe. Let that UI receive focus.
      modal={!approval}
      disablePointerDismissal
    >
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-6 duration-300 motion-reduce:animate-none sm:max-w-md sm:p-8">
        <DialogHeader className="shrink-0 gap-2 pr-5">
          <DialogTitle className="text-[24px] font-semibold leading-tight tracking-tight">
            {title}
          </DialogTitle>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <DialogDescription className="min-w-0 flex-1 break-words">{name}</DialogDescription>
            <span className="shrink-0 text-small text-muted-foreground tabular-nums">
              {success ? 'Complete' : `Step ${currentIndex + 1} of ${steps.length}`}
            </span>
          </div>
        </DialogHeader>

        <motion.div layoutScroll className="min-h-0 overflow-y-auto overscroll-contain">
          <ol className="my-6 flex flex-col gap-2" aria-label="Launch progress">
            {steps.map((step, index) => {
              const done = success || index < currentIndex;
              const active = !success && index === currentIndex;
              const state = done ? 'done' : active ? failed ? 'error' : 'active' : 'pending';
              const label = done ? 'Complete' : active ? activeLabel : 'Pending';
              return (
                <li
                  key={step.id}
                  aria-current={active ? 'step' : undefined}
                  className="relative isolate grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-x-3 rounded-xl px-3 py-2.5"
                >
                  {active && (
                    <motion.span
                      layoutId="launch-active-step"
                      aria-hidden="true"
                      className={cn('absolute inset-0 -z-10 rounded-xl', failed ? 'bg-destructive/5' : 'bg-surface')}
                      transition={focalTransition}
                    />
                  )}
                  {index < steps.length - 1 && (
                    <span className="absolute top-12 -bottom-2 left-[29px] w-px overflow-hidden bg-border" aria-hidden="true">
                      <motion.span
                        className="absolute inset-0 origin-top bg-emphasis"
                        initial={false}
                        animate={{ scaleY: done ? 1 : 0 }}
                        transition={transition}
                      />
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative grid size-9 place-items-center rounded-full text-small font-medium tabular-nums transition-colors duration-200 motion-reduce:transition-none',
                      done ? 'bg-primary text-primary-foreground'
                        : active && failed ? 'bg-destructive/10 text-destructive'
                          : active ? 'bg-foreground text-background' : 'bg-surface text-muted-foreground',
                    )}
                  >
                    {open && active && !failed && !approval && (
                      <span className="absolute -inset-1 animate-spin rounded-full border-2 border-transparent border-t-emphasis [animation-duration:1.5s] motion-reduce:animate-none" />
                    )}
                    <AnimatePresence initial={false} mode="wait">
                      <motion.span
                        key={state}
                        className="grid place-items-center"
                        initial={{ opacity: 0, scale: reduced ? 1 : 0.65 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                        transition={transition}
                      >
                        {done ? (
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <motion.path
                              d="m5 12 4 4L19 6"
                              initial={{ pathLength: reduced ? 1 : 0 }}
                              animate={{ pathLength: 1 }}
                              transition={transition}
                            />
                          </svg>
                        ) : active && failed ? <CircleAlert className="size-4" /> : index + 1}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-ui font-medium', !done && !active && 'text-muted-foreground')}>
                      {step.title}
                    </p>
                    <motion.p
                      key={label}
                      initial={{ opacity: reduced ? 1 : 0 }}
                      animate={{ opacity: 1 }}
                      transition={transition}
                      className="mt-0.5 text-small text-muted-foreground"
                    >
                      {label}
                    </motion.p>
                  </div>
                </li>
              );
            })}
          </ol>

          <Alert className={cn('flex-col gap-0 overflow-clip transition-colors duration-200 motion-reduce:transition-none', failed && 'bg-destructive/5', success && 'bg-primary/10')}>
            <p className="sr-only" role={failed ? 'alert' : 'status'} aria-atomic="true">
              {statusLabel}. {operation.message}
            </p>
            <motion.div layout={reduced ? false : 'size'} transition={focalTransition} className="w-full overflow-clip">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={`${operation.status}-${operation.phase}-${operation.message}`}
                  initial={{ opacity: 0, x: reduced ? 0 : 16, filter: reduced ? 'none' : 'blur(2px)' }}
                  animate={{ opacity: 1, x: 0, filter: reduced ? 'none' : 'blur(0px)' }}
                  exit={{ opacity: 0, x: reduced ? 0 : -12, transition: { duration: reduced ? 0 : 0.15 } }}
                  transition={focalTransition}
                  aria-hidden="true"
                  className="flex min-w-0 items-start gap-3"
                >
                  <motion.span
                    initial={{ scale: reduced ? 1 : 0.75, rotate: reduced ? 0 : -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={focalTransition}
                    className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-background', failed && 'text-destructive', success && 'bg-primary text-primary-foreground')}
                  >
                    <StatusIcon className={cn('size-4', open && !success && !failed && operation.phase === 'working' && 'animate-spin motion-reduce:animate-none')} />
                  </motion.span>
                  <AlertDescription className="flex flex-col gap-1">
                    <AlertTitle className="text-small">{statusLabel}</AlertTitle>
                    <p className="break-words text-small leading-relaxed">{operation.message}</p>
                  </AlertDescription>
                </motion.div>
              </AnimatePresence>
            </motion.div>
            {operation.hash && (
              <Link
                href={`https://stellar.expert/explorer/testnet/tx/${operation.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-small font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                View transaction <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </Alert>
        </motion.div>

        <AnimatePresence initial={false}>
          {(success || failed) && (
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="mt-5 flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end"
            >
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {failed && <Button onClick={onRetry}>Retry / check status</Button>}
              {success && operation.curveAddress && (
                <Link href={`/trade/${operation.curveAddress}`} className={buttonVariants()}>
                  Open trade <ArrowUpRight data-icon="inline-end" />
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
