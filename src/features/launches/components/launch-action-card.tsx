'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { LaunchLogoMark } from './launch-logo-mark';
import { LaunchPanel, launchFocus } from './launch-panel';

const action = 'flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold';
const easeOut = [0.16, 1, 0.3, 1] as const;

/** The trade route handles execution; this only reflects what the contract currently allows. */
function TradeAction({ status, ticker, href, opensIn }: { status: string; ticker: string; href: string; opensIn?: string }) {
  if (status === 'Open' || status === 'Failed') {
    const failed = status === 'Failed';
    return (
      <>
        <Link
          href={href}
          className={cn(
            action,
            'transition-colors',
            failed ? 'bg-foreground text-background hover:bg-foreground/85' : 'bg-lime text-ink hover:bg-lime-hover',
            launchFocus,
          )}
        >
          {failed ? `Sell back $${ticker}` : `Trade $${ticker}`}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        {failed && (
          <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">
            The target was not reached. Buying has stopped; holders can sell back to the curve.
          </p>
        )}
      </>
    );
  }
  const [label, detail] =
    status === 'Scheduled'
      ? [opensIn ? `Opens ${opensIn}` : 'Not open yet', 'Curve trading has not started.']
      : status === 'Graduated'
        ? ['Curve closed', 'Curve trading ended at graduation.']
        : status === 'Loading'
          ? ['Loading…', 'Reading the contract status.']
          : ['Trading unavailable', 'The contract status could not be read.'];
  return (
    <>
      <p aria-disabled="true" className={cn(action, 'bg-secondary text-muted-foreground tabular-nums')}>
        {label}
      </p>
      <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">{detail}</p>
    </>
  );
}

/**
 * Project identity that joins the card once the cover has scrolled away. It repeats the page h1,
 * so it is hidden from assistive technology.
 */
function DockedIdentity({ logo, name, ticker, seed }: { logo?: string; name: string; ticker: string; seed: string }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ height: 0, marginBottom: 0 }}
      animate={{ height: 'auto', marginBottom: 20 }}
      exit={{ height: 0, marginBottom: 0, transition: { duration: 0.32, ease: easeOut } }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <div className="flex items-center gap-3">
        <LaunchLogoMark logo={logo} name={name} seed={seed} size={44} className="ring-1 ring-border" />
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, x: -10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 0.16, duration: 0.45, ease: easeOut } }}
          exit={{ opacity: 0, x: -6, filter: 'blur(4px)', transition: { duration: 0.14 } }}
        >
          <p className="truncate text-[16px] leading-tight font-semibold tracking-[-0.025em]">{name}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">${ticker}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** Price, status-aware trade link and the terms worth knowing before following it. */
export function LaunchActionCard({
  name,
  ticker,
  logo,
  seed,
  docked,
  status,
  network,
  address,
  price,
  priceHint,
  stale,
  opensIn,
  terms,
}: {
  name: string;
  ticker: string;
  logo?: string;
  seed: string;
  /** Show the project identity here, once the cover is out of view. */
  docked: boolean;
  status: string;
  network: ApiNetwork;
  address: string;
  price: string;
  priceHint?: string;
  stale: boolean;
  opensIn?: string;
  terms: (readonly [string, ReactNode])[];
}) {
  return (
    <LaunchPanel raised aria-label={`Trade ${name}`} className="p-5 sm:p-6">
      <AnimatePresence initial={false}>
        {docked && <DockedIdentity key="identity" logo={logo} name={name} ticker={ticker} seed={seed} />}
      </AnimatePresence>

      <p className="text-[13px] text-muted-foreground">Current price</p>
      <p className="mt-1 break-words text-[24px] leading-tight font-semibold tracking-[-0.035em] tabular-nums">{price}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground tabular-nums">
        {stale && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-chart-5" />}
        {stale ? 'Before fee · may be outdated' : priceHint}
      </p>

      <div className="mt-5">
        <TradeAction status={status} ticker={ticker} href={`/trade/${address}?network=${network}`} opensIn={opensIn} />
      </div>

      {terms.length > 0 && (
        <div className="mt-6 border-t border-divider pt-5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Key terms</h2>
          <dl className="mt-3 flex flex-col gap-3 text-[13.5px]">
            {terms.map(([term, value]) => (
              <div key={term} className="grid grid-cols-[minmax(0,104px)_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="min-w-0 leading-snug break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </LaunchPanel>
  );
}
