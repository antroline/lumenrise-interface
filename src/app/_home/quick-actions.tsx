import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { DarkPanel } from '@/components/dark-panel';
import { documentationItem } from '@/components/shell/navigation';

/** The LumenRise mark at poster scale: a split circle cut by a threshold bar. */
function SplitCircle() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 -right-16 size-72 -translate-y-1/2 sm:right-8 sm:size-64 lg:size-72">
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.12]" />
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-white/[0.05]" />
      </span>
      <span className="absolute top-1/2 -left-10 h-3.5 w-3/4 -translate-y-1/2 bg-white/85" />
      <span className="absolute top-1/2 -left-10 h-3.5 w-1/5 -translate-y-1/2 bg-lime" />
    </span>
  );
}

function QuarterCircles() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 grid grid-cols-2 gap-1">
      <span className="size-12 rounded-tl-full bg-secondary" />
      <span className="size-12 rounded-tl-full bg-foreground" />
      <span className="size-12" />
      <span className="size-12 rounded-tl-full bg-secondary" />
    </span>
  );
}

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading" className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
      <DarkPanel className="rounded-2xl">
        <Link
          href="/create"
          className="group relative flex min-h-64 flex-col justify-between gap-8 p-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime sm:p-8"
        >
          <SplitCircle />
          <div className="relative max-w-[26rem]">
            <h2 id="quick-actions-heading" className="text-big font-semibold sm:text-display">Create a launch</h2>
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
              Set the supply, graduation target and timing for a bonding curve on Stellar Testnet.
            </p>
          </div>
          <span className="relative inline-flex h-control w-fit items-center gap-2 rounded-lg bg-lime px-[18px] text-sm font-semibold text-ink transition-colors group-hover:bg-lime-hover">
            Start creating
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </Link>
      </DarkPanel>

      <a
        href={documentationItem.href}
        className="group relative isolate flex min-h-64 flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:p-8 dark:shadow-none dark:ring-white/[0.07]"
      >
        <QuarterCircles />
        <div className="relative">
          <h3 className="text-xl font-semibold tracking-[-0.02em]">Read the documentation</h3>
          <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
            How curves price tokens, what graduation means, and how fees and vesting work.
          </p>
        </div>
        <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 group-hover:underline">
          Open docs
          <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </a>
    </section>
  );
}
