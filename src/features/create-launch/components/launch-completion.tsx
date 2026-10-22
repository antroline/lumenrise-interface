'use client';
import { API_NETWORK } from '@/lib/stellar/network';

import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  LaunchOperation,
  LaunchOperationStep,
} from '../lib/launch-operation';
import { launchTransition, useLaunchReducedMotion } from '../lib/launch-motion';
import { useCompletionMessage } from '../hooks/use-completion-message';

const CompletionFrame = forwardRef<
  HTMLSpanElement,
  { children: ReactNode; className?: string; onEntered?: () => void }
>(function CompletionFrame({ children, className, onEntered }, ref) {
  const present = useIsPresent();
  return (
    <motion.span
      ref={ref}
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: 0, y: 5, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        y: -3,
        filter: 'blur(4px)',
        transition: { duration: 0.14 },
      }}
      transition={{ ...launchTransition, duration: 0.3 }}
      onAnimationComplete={() => { if (present) onEntered?.(); }}
      className={cn('block', className)}
    >
      {children}
    </motion.span>
  );
});

/** Finish the outgoing frame before showing the latest content, without overlapping text. */
function CompletionChange({
  changeKey,
  children,
  className,
  frameClassName,
  onEntered,
}: {
  changeKey: string;
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  onEntered?: () => void;
}) {
  const reduced = useLaunchReducedMotion();
  return (
    <motion.span
      layout={reduced ? false : 'position'}
      transition={launchTransition}
      className={cn('relative block', className)}
    >
      {reduced ? (
        <span className={cn('block', frameClassName)}>{children}</span>
      ) : (
        <AnimatePresence initial={false} mode="wait">
          <CompletionFrame key={changeKey} className={frameClassName} onEntered={onEntered}>
            {children}
          </CompletionFrame>
        </AnimatePresence>
      )}
    </motion.span>
  );
}

type SignatureLabel = 'Pending' | 'Processing' | 'Awaiting signature' | 'Complete' | 'Needs attention';

function SignatureStatus({ label, index }: { label: SignatureLabel; index: number }) {
  const reduced = useLaunchReducedMotion();
  const { message, onEntered } = useCompletionMessage(label, label === 'Awaiting signature' || label === 'Complete' || label === 'Needs attention', reduced ? 0 : 440);
  const done = message === 'Complete';
  const active = message !== 'Pending' && !done;
  const Icon = done ? Check : message === 'Needs attention' ? CircleAlert : message === 'Awaiting signature' ? Wallet : message === 'Processing' ? LoaderCircle : null;
  return <CompletionChange changeKey={message} onEntered={onEntered}>
    <span className="mb-3 flex items-center justify-between gap-2">
      <span aria-hidden="true" className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums', done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground', active && 'bg-foreground text-background')}>
        {Icon ? <Icon className={cn('size-4', message === 'Processing' && 'animate-spin motion-reduce:animate-none')} /> : index + 1}
      </span>
      <span className="text-xs text-muted-foreground">{message}</span>
    </span>
  </CompletionChange>;
}

// Issuance is signed by the temporary issuer; these three actions need the wallet.
const signatureSteps = [
  {
    id: 'setup',
    title: 'Set up token',
    detail: 'Fund the issuer and add your trustline.',
  },
  {
    id: 'deploy',
    title: 'Deploy token contract',
    detail: 'Approve the token contract deployment.',
  },
  {
    id: 'curve',
    title: 'Create launch',
    detail: 'Create the curve and transfer the token supply.',
  },
] as const;

const operationOrder: LaunchOperationStep[] = [
  'check',
  'logo',
  'setup',
  'issue',
  'deploy',
  'curve',
  'index',
];

export function LaunchCompletion({
  operation,
  working,
  name,
  symbol,
  logo,
  onRetry,
  onBack,
}: {
  operation: LaunchOperation | null;
  working: boolean;
  name: string;
  symbol: string;
  logo: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduced = useLaunchReducedMotion();
  const failed = operation?.status === 'error';
  const success = operation?.status === 'success';
  const approval = !failed && !success && operation?.phase === 'approval';
  const idle = !operation && !working;
  const running = !failed && !success && !idle;
  const currentIndex = operation ? operationOrder.indexOf(operation.step) : -1;
  const activeSignature = signatureSteps.find(
    (step) => step.id === operation?.step,
  );

  const visualState = success
    ? 'success'
    : failed
      ? 'error'
      : approval
        ? 'approval'
        : idle
          ? 'idle'
          : 'running';

  const title = success
    ? 'Your launch is ready'
    : failed
      ? 'Your launch needs attention'
      : idle
        ? 'Complete your launch'
        : 'Bringing your launch to life';

  const status = success
    ? 'Confirmed on Stellar. Your project page is ready.'
    : failed
      ? operation.message
      : idle
        ? 'Connect your wallet and continue when you are ready.'
        : approval
          ? 'Review and approve the request in your wallet to continue.'
          : operation?.step === 'index'
            ? 'Your launch is confirmed. Preparing your project page…'
            : operation?.phase === 'confirming'
              ? 'Confirming your transaction on Stellar…'
              : 'Preparing your launch. Your wallet will ask for approval when needed.';

  const { message: displayedStatus, onEntered: onStatusEntered } = useCompletionMessage(status, approval || failed || success || idle, reduced ? 0 : 440);

  useEffect(() => {
    // Do not take focus from a wallet approval that has already opened.
    if (document.activeElement?.tagName !== 'IFRAME')
      headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      aria-labelledby="launch-completion-title"
      className="animate-settle flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] min-w-0 flex-col bg-card px-4 py-6 sm:px-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border lg:p-8 [scrollbar-width:thin]"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-4 sm:py-8">
        <motion.div
          layout={reduced ? false : 'position'}
          transition={launchTransition}
          aria-hidden="true"
          className="relative mx-auto mb-7 grid size-44 shrink-0 place-items-center sm:size-52"
        >
            <div className="absolute inset-0 rounded-full border border-border" />
            <div
              className={cn(
                'absolute inset-0 rounded-full border-2 border-transparent border-t-primary',
                running &&
                  'animate-spin [animation-duration:3s] motion-reduce:animate-none',
                failed && 'border-t-destructive',
                success && 'border-primary',
              )}
            />
            <div
              className={cn(
                'absolute inset-4 rounded-full border border-border border-b-foreground/50',
                running &&
                  'animate-spin [animation-direction:reverse] [animation-duration:5s] motion-reduce:animate-none',
              )}
            />
            <Avatar className="size-24 rounded-2xl sm:size-28">
              <AvatarImage
                src={logo || undefined}
                alt=""
                className="rounded-2xl object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-secondary text-2xl font-semibold">
                {(symbol || name || 'LR').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute right-5 bottom-5 grid size-10 place-items-center rounded-full border-4 border-card bg-foreground text-background sm:right-6 sm:bottom-6',
                success && 'bg-primary text-primary-foreground',
                failed && 'bg-bad-soft text-bad',
              )}
            >
              <CompletionChange changeKey={success ? 'success' : failed ? 'error' : 'wallet'}>
              {success ? (
                <Check className="size-5" />
              ) : failed ? (
                <CircleAlert className="size-5" />
              ) : (
                <Wallet className="size-5" />
              )}
              </CompletionChange>
            </span>
        </motion.div>

        <motion.p
          layout={reduced ? false : 'position'}
          transition={launchTransition}
          className="mb-2 truncate text-center text-sm font-medium text-muted-foreground"
          title={name || symbol}
        >
          <CompletionChange changeKey={`${name}:${symbol}`}>
            {name.trim() || symbol || 'Your token'}
            {name.trim() && symbol ? ` · ${symbol}` : ''}
          </CompletionChange>
        </motion.p>
        <motion.h2
          layout={reduced ? false : 'position'}
          transition={launchTransition}
          ref={headingRef}
          id="launch-completion-title"
          tabIndex={-1}
          className="text-center text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          <CompletionChange changeKey={title}>{title}</CompletionChange>
        </motion.h2>
        <motion.div
          layout={reduced ? false : 'position'}
          transition={launchTransition}
          className="mx-auto mt-3 max-w-lg text-center"
        >
          <span
            role={failed ? 'alert' : 'status'}
            aria-atomic="true"
            className="sr-only"
          >
            {approval && activeSignature ? `${activeSignature.title}. ` : ''}
            {displayedStatus}
          </span>
          <span aria-hidden="true">
            <CompletionChange
              changeKey={displayedStatus}
              onEntered={onStatusEntered}
              className={cn(
                'break-words text-sm leading-relaxed text-muted-foreground',
                failed && 'text-destructive',
              )}
            >
              {displayedStatus}
            </CompletionChange>
          </span>
        </motion.div>

        <motion.ol
          layout={reduced ? false : 'position'}
          transition={launchTransition}
          className="mt-8 grid gap-3 sm:grid-cols-3"
          aria-label="Wallet signatures"
        >
          {signatureSteps.map((step, index) => {
            const active = operation?.step === step.id && !success;
            const done =
              success || operationOrder.indexOf(step.id) < currentIndex;
            const signing = active && approval;
            const hash =
              operation?.transactionHashes?.[step.id] ??
              (active ? operation?.hash : undefined);
            const label = done
              ? 'Complete'
              : active
                ? failed
                  ? 'Needs attention'
                  : signing
                    ? 'Awaiting signature'
                    : 'Processing'
                : 'Pending';
            return (
              <motion.li
                layout={reduced ? false : 'position'}
                transition={launchTransition}
                key={step.id}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-48 min-w-0 flex-col rounded-xl border border-border p-4 transition-[background-color,border-color] duration-300 motion-reduce:transition-none',
                  active && 'border-foreground/30 bg-secondary/60',
                )}
              >
                <SignatureStatus label={label} index={index} />
                <motion.h3
                  layout={reduced ? false : 'position'}
                  transition={launchTransition}
                  className="text-sm font-semibold"
                >
                  {step.title}
                </motion.h3>
                <motion.p
                  layout={reduced ? false : 'position'}
                  transition={launchTransition}
                  className="mt-1 text-xs leading-relaxed text-muted-foreground"
                >
                  {step.detail}
                </motion.p>
                <CompletionChange
                  changeKey={hash ?? 'no-transaction'}
                  className="mt-auto h-11 shrink-0"
                >
                  {hash && (
                    <Link
                      href={`https://stellar.expert/explorer/${API_NETWORK}/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View transaction for ${step.title}`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      Transaction{' '}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </CompletionChange>
              </motion.li>
            );
          })}
        </motion.ol>

        <CompletionChange changeKey={running ? 'running' : visualState}>
          {running ? (
            <span className="mt-5 block text-center text-xs leading-relaxed text-muted-foreground">
              Keep this page open while you complete the wallet approvals.
            </span>
          ) : (
            <span className="mt-7 flex flex-wrap items-center justify-center gap-3 pb-[env(safe-area-inset-bottom)]">
              {!success && (
                <Button variant="outline" size="lg" onClick={onBack}>
                  <ArrowLeft data-icon="inline-start" /> Back to review
                </Button>
              )}
              {!success && (
                <Button size="lg" onClick={onRetry} disabled={working}>
                  {idle ? 'Connect wallet to continue' : 'Check / retry'}
                </Button>
              )}
              {success && operation.curveAddress && (
                <Link
                  href={`/launch/${operation.curveAddress}?network=${API_NETWORK}`}
                  className={buttonVariants({ size: 'lg' })}
                >
                  View launch <ArrowUpRight data-icon="inline-end" />
                </Link>
              )}
            </span>
          )}
        </CompletionChange>
      </div>
    </section>
  );
}
