'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CircleAlert, LoaderCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
import styles from './launch-operation-dialog.module.css';

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
  const failed = operation?.status === 'error';
  // A stable callback also runs when the portal mounts on an error/reopen.
  const revealErrorStep = useCallback((element: HTMLLIElement | null) => {
    if (open && failed) {
      element?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [open, failed]);

  if (!operation) return null;
  const currentIndex = steps.findIndex((step) => step.id === operation.step);
  const success = operation.status === 'success';
  const approval = !failed && !success && operation.phase === 'approval';
  const transition = reduced ? { duration: 0 } : launchTransition;
  const focalTransition = reduced ? { duration: 0 } : { ...launchTransition, duration: 0.32 };
  const title = success ? 'Your launch is ready'
    : failed ? 'Launch paused' : 'Launching your token';
  const activeLabel = failed ? 'Needs attention'
    : approval ? 'Awaiting approval'
      : operation.phase === 'confirming' ? 'Confirming on Stellar' : 'In progress';
  const statusLabel = success ? 'Complete' : activeLabel;
  const completedSteps = success ? steps.length : currentIndex;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // Blux can open its approval UI in a sibling iframe. Let that UI receive focus.
      modal={!approval}
      disablePointerDismissal
    >
      <DialogContent className={cn(styles.popup, 'flex h-[min(40rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden rounded-3xl p-6 sm:max-w-md')}>
        <DialogHeader className="h-20 shrink-0 gap-2 pr-5">
          <DialogTitle className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[24px]">
            {title}
          </DialogTitle>
          <div className="flex min-w-0 items-baseline gap-3">
            <DialogDescription className="min-w-0 flex-1 truncate" title={name}>{name}</DialogDescription>
            <span className="shrink-0 text-small text-muted-foreground tabular-nums">
              {success ? 'Complete' : `Step ${currentIndex + 1} of ${steps.length}`}
            </span>
          </div>
        </DialogHeader>

        <p className="sr-only" role="status" aria-atomic="true">
          {statusLabel}. {failed ? '' : operation.message}
        </p>

        <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ol className="my-4 flex flex-col gap-2" aria-label="Launch progress">
            {steps.map((step, index) => {
              const done = success || index < currentIndex;
              const active = !success && index === currentIndex;
              const state = done ? 'done' : active ? failed ? 'error' : 'active' : 'pending';
              const label = done ? 'Complete' : active ? activeLabel : 'Pending';
              return (
                <li
                  key={step.id}
                  ref={active ? revealErrorStep : undefined}
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
                      'relative mt-0.5 grid size-9 self-start place-items-center rounded-full text-small font-medium tabular-nums transition-colors duration-200 motion-reduce:transition-none',
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
                    {active && failed && (
                      <p role="alert" className="mt-2 break-words text-small leading-relaxed text-destructive">
                        {operation.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.div>

        <div className="mt-4 flex shrink-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-small text-muted-foreground">
            <span>{statusLabel}</span>
            <span className="tabular-nums">{completedSteps} / {steps.length} complete</span>
          </div>
          <div className="relative overflow-hidden rounded-full">
            <Progress
              value={completedSteps}
              max={steps.length}
              size="thick"
              tone="lime"
              aria-label="Launch progress"
              aria-valuetext={`${completedSteps} of ${steps.length} steps complete. ${statusLabel}.`}
              className="[&_[data-slot=progress-indicator]]:duration-500 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
            />
            {open && !failed && !success && !reduced && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 origin-left rounded-full bg-primary/40"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 0.9, 1], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          <div className="flex h-5 items-center justify-between gap-3 text-small text-muted-foreground">
            <span>Stellar Testnet</span>
            {operation.hash && (
              <Link
                href={`https://stellar.expert/explorer/testnet/tx/${operation.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                View transaction <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {failed && <Button className="min-w-0 flex-1" onClick={onRetry}>Check / retry</Button>}
            {success && operation.curveAddress && (
              <Link href={`/trade/${operation.curveAddress}`} className={cn(buttonVariants(), 'min-w-0 flex-1')}>
                Open trade <ArrowUpRight data-icon="inline-end" />
              </Link>
            )}
            {!success && !failed && (
              <Button disabled className="min-w-0 flex-1">
                <LoaderCircle data-icon="inline-start" className={cn(open && 'animate-spin motion-reduce:animate-none')} />
                Launching…
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
