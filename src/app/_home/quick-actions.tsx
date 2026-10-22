import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { DarkPanel } from '@/components/dark-panel';
import { documentationItem } from '@/components/shell/navigation';

/** The LumenRise mark: a split circle cut by a threshold bar. */
function SplitCircle() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 -right-32 size-44 -translate-y-1/2 sm:-right-28 sm:size-48 xl:right-4">
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.12]" />
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-white/[0.05]" />
      </span>
      <span className="absolute top-1/2 -left-6 h-2 w-3/4 -translate-y-1/2 bg-white/85" />
      <span className="absolute top-1/2 -left-6 h-2 w-1/5 -translate-y-1/2 bg-lime" />
    </span>
  );
}

function QuarterCircles() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 grid grid-cols-2 gap-1">
      <span className="size-8 rounded-tl-full bg-secondary" />
      <span className="size-8 rounded-tl-full bg-foreground" />
      <span className="size-8" />
      <span className="size-8 rounded-tl-full bg-secondary" />
    </span>
  );
}

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading" className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <DarkPanel className="rounded-2xl">
        <Link
          href="/create"
          className="group relative flex h-full min-h-48 flex-col justify-between gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime sm:p-6"
        >
          <SplitCircle />
          <div className="relative max-w-[30ch]">
            <h2 id="quick-actions-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Create a launch</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Configure a bonding curve launch on Stellar Testnet.
            </p>
          </div>
          <span className="relative inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-lime px-4 text-sm font-semibold text-ink transition-colors group-hover:bg-lime-hover motion-reduce:transition-none pointer-coarse:min-h-11">
            Start creating
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </Link>
      </DarkPanel>

      <a
        href={documentationItem.href}
        className="group relative isolate flex min-w-0 min-h-48 flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:p-6"
      >
        <QuarterCircles />
        <div className="relative">
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Read the documentation</h3>
          <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
            Explore bonding curves, graduation, fees and vesting.
          </p>
        </div>
        <span className="relative inline-flex min-h-10 w-fit items-center gap-1.5 text-sm font-semibold underline-offset-4 group-hover:underline pointer-coarse:min-h-11">
          Open docs
          <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </a>
    </section>
  );
}
