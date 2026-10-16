import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HowItWorks } from './_components/how-it-works';

export const metadata: Metadata = { title: 'How bonding launches work' };

const terms = [
  {
    term: 'Raised',
    detail: 'The pair asset the curve holds from net purchases, after fees. It is the area under the curve up to the current price.',
  },
  {
    term: 'Graduation target',
    detail: 'The raise at which the contract marks the launch as graduated and the curve closes. Each launch sets its own.',
  },
  {
    term: 'Progress',
    detail: 'Raised as a share of the graduation target. When it cannot be read, the page shows it as unavailable rather than zero.',
  },
  {
    term: 'Opens and ends',
    detail: 'Trading starts at the scheduled opening time. A launch that has not graduated by its configured end fails.',
  },
];

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[62ch]">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[32px]">
          How bonding launches work
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Every launch on LumenRise publishes its curve and its graduation target before trading opens. This page explains
          what those numbers mean, so you can read any launch page.
        </p>
      </header>

      <HowItWorks />

      <section aria-labelledby="terms-heading" className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <h2 id="terms-heading" className="text-[22px] leading-tight font-semibold tracking-[-0.03em] sm:text-[24px]">
            Reading a launch
          </h2>
          <p className="mt-3 max-w-[44ch] text-[14px] leading-relaxed text-muted-foreground">
            You will find these readings on every launch card and launch page.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-9 items-center gap-1.5 text-[14px] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            See live launches
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <dl className="divide-y divide-foreground/10 border-y border-foreground/10">
          {terms.map(({ term, detail }) => (
            <div key={term} className="grid gap-1 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[14px] font-semibold">{term}</dt>
              <dd className="text-[14px] leading-relaxed text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
