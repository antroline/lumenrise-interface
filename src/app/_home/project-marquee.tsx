'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { TokenLogo } from '@/components/token-logo';
import { Button } from '@/components/ui/button';
import { compactAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { launchStatus, type HomeStatus } from './home-discovery';
import { MiniCurve } from './mini-curve';
import { curveInput, launchHref, progressLabel, type HomeLaunch } from './use-home-launches';

const VARIANTS = ['graphite', 'crop', 'ticks', 'curve'] as const;
type Variant = (typeof VARIANTS)[number];

const MAX_CARDS = 12;
/** Below this the row is static; a loop of two or three cards reads as a glitch, not a marquee. */
const MIN_LOOP = 4;
/** Each copy of the loop holds at least this many cards so it is wider than large screens. */
const MIN_TRACK = 8;
const SECONDS_PER_CARD = 6;
const TICKS = 22;

const statusText: Record<HomeStatus, string> = {
  Open: 'Open',
  Filled: '100% filled',
  Scheduled: 'Upcoming',
  Graduated: 'Graduated',
  Failed: 'Failed',
};

const fraction = (launch: HomeLaunch) => Math.max(0, Math.min(1, launch.bonding.progressBps / 10_000));

function StatusChip({ status, inverse }: { status: HomeStatus; inverse?: boolean }) {
  const live = status === 'Open' || status === 'Filled';
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-meta font-medium',
        inverse ? 'bg-white/10 text-white' : live ? 'bg-ink text-white dark:bg-foreground dark:text-background' : 'bg-secondary text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          live || status === 'Graduated' ? 'bg-lime' : status === 'Scheduled' ? 'border border-current' : 'bg-current opacity-60',
        )}
      />
      {statusText[status]}
    </span>
  );
}

/** Threshold bar from the brand library: a flat track, lime up to the current point, an ink tick at it. */
function ThresholdBar({ value, inverse }: { value: number; inverse?: boolean }) {
  return (
    <span aria-hidden="true" className={cn('relative block h-2 rounded-[3px]', inverse ? 'bg-white/12' : 'bg-foreground/[0.08]')}>
      <span className="absolute inset-y-0 left-0 rounded-[3px] bg-lime" style={{ width: `${value * 100}%` }} />
      <span
        className={cn('absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full', inverse ? 'bg-white' : 'bg-foreground')}
        style={{ left: `${value * 100}%` }}
      />
    </span>
  );
}

/** Signal ticks rising toward graduation; the current position is the one lime tick. */
function SignalTicks({ value }: { value: number }) {
  const current = Math.min(TICKS - 1, Math.floor(value * TICKS));
  return (
    <span aria-hidden="true" className="flex h-12 items-end justify-between">
      {Array.from({ length: TICKS }, (_, index) => (
        <span
          key={index}
          className={cn(
            'w-[3px] rounded-full',
            index === current && value > 0 ? 'bg-lime ring-1 ring-foreground/80' : index < current ? 'bg-foreground' : 'bg-foreground/15',
          )}
          style={{ height: `${30 + (index / (TICKS - 1)) * 70}%` }}
        />
      ))}
    </span>
  );
}

function CardArt({ variant }: { variant: Variant }) {
  if (variant === 'graphite')
    return (
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 -z-10 size-52 rounded-full bg-white/[0.06]">
        <span className="absolute top-1/2 left-0 h-3 w-1/2 bg-white/[0.07]" />
      </span>
    );
  if (variant === 'crop')
    return (
      <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-20 -z-10 size-48 overflow-hidden rounded-full bg-secondary dark:bg-white/[0.05]">
        <span className="absolute top-[58%] left-0 h-3 w-2/5 bg-foreground/90" />
      </span>
    );
  if (variant === 'ticks')
    return <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 -z-10 size-16 rounded-bl-full bg-secondary dark:bg-white/[0.05]" />;
  return null;
}

function ProjectCard({ launch, network, variant }: { launch: HomeLaunch; network: ApiNetwork; variant: Variant }) {
  const b = launch.bonding;
  const status = launchStatus(launch);
  const pair = pairLabel(launch.pair, network);
  const value = fraction(launch);
  const inverse = variant === 'graphite';

  return (
    <Link
      href={launchHref(launch, network)}
      className={cn(
        'group relative isolate flex h-[17rem] w-[17.5rem] flex-col overflow-hidden rounded-2xl p-5 outline-none',
        'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        inverse
          ? 'dark bg-ink text-foreground ring-1 ring-white/[0.08] dark:bg-panel'
          : 'bg-card text-card-foreground ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:shadow-none dark:ring-white/[0.07]',
      )}
    >
      <CardArt variant={variant} />

      <div className="flex items-start justify-between gap-3">
        <span className={cn('size-10 shrink-0 overflow-hidden rounded-full [&_img]:rounded-none [&_svg]:rounded-none', inverse ? 'ring-2 ring-white/15' : 'ring-2 ring-card')}>
          <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={40} />
        </span>
        <StatusChip status={status} inverse={inverse} />
      </div>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-lg leading-tight font-semibold tracking-[-0.02em] underline-offset-4 group-hover:underline" title={launch.metadata.name}>
          {launch.metadata.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          ${launch.metadata.symbol} · {pair}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-big font-semibold tabular-nums">{progressLabel(b.progressBps)}</span>
          <span className="text-xs text-muted-foreground">of target</span>
        </p>
        {variant === 'ticks' ? (
          <SignalTicks value={value} />
        ) : variant === 'curve' ? (
          <MiniCurve input={curveInput(b)} failed={status === 'Failed'} />
        ) : (
          <ThresholdBar value={value} inverse={inverse} />
        )}
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {status === 'Scheduled'
            ? `Opens ${unixDate(b.startsAt)}`
            : `${compactAmount(b.state.quoteReserve)} of ${compactAmount(b.curve.graduationTarget)} ${pair} raised`}
        </p>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-[17rem] w-[17.5rem] shrink-0 flex-col rounded-2xl bg-card p-5 ring-1 ring-black/[0.05] dark:ring-white/[0.07]">
      <div className="size-10 rounded-full bg-secondary" />
      <div className="mt-3 h-5 w-2/3 rounded bg-secondary" />
      <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
      <div className="mt-auto h-7 w-1/2 rounded bg-secondary" />
      <div className="mt-3 h-2 rounded bg-secondary" />
    </div>
  );
}

export function ProjectMarquee({
  launches,
  network,
  pending,
}: {
  launches: HomeLaunch[];
  network: ApiNetwork;
  pending: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const base = launches.slice(0, MAX_CARDS);
  const loops = base.length >= MIN_LOOP;
  const repeat = loops ? Math.ceil(MIN_TRACK / base.length) : 1;
  const track = Array.from({ length: base.length * repeat }, (_, index) => base[index % base.length]);

  const copy = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn('flex shrink-0 gap-4 py-2', loops && 'pr-4', hidden && 'motion-reduce:hidden')}
    >
      {track.map((launch, index) => {
        // Repeats within a copy pad the loop for wide screens; only the first pass is announced.
        const repeated = hidden || index >= base.length;
        return (
          <li
            key={`${launch.contractId}-${index}`}
            aria-hidden={(!hidden && repeated) || undefined}
            inert={(!hidden && repeated) || undefined}
            className={cn(!hidden && repeated && 'motion-reduce:hidden')}
          >
            <ProjectCard launch={launch} network={network} variant={VARIANTS[index % VARIANTS.length]} />
          </li>
        );
      })}
    </ul>
  );

  return (
    <section aria-labelledby="marquee-heading" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="marquee-heading" className="text-h2 font-semibold">On the curve</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bonding curve launches on Stellar. Open one to read its terms.</p>
        </div>
        <div className="flex items-center gap-2">
          {loops && (
            <Button
              variant="outline"
              size="icon-sm"
              aria-pressed={paused}
              aria-label={paused ? 'Resume project carousel' : 'Pause project carousel'}
              onClick={() => setPaused((value) => !value)}
              className="motion-reduce:hidden"
            >
              {paused ? <Play /> : <Pause />}
            </Button>
          )}
          <Button variant="outline" size="sm" render={<Link href={`/launches?network=${network}`} />} nativeButton={false}>
            All projects <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {pending ? (
        <div role="status" aria-label="Loading projects" className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: 5 }, (_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : base.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
          No launches are indexed on this network yet.
        </p>
      ) : (
        <div
          className={cn(
            'group/marquee -mx-2 px-2',
            loops
              ? 'overflow-hidden mask-x-from-92% mask-x-to-100% motion-reduce:overflow-x-auto motion-reduce:mask-none'
              : 'overflow-x-auto',
          )}
        >
          <div
            data-paused={paused || undefined}
            className={cn(
              'flex w-max',
              loops &&
                'animate-marquee group-focus-within/marquee:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused] data-paused:[animation-play-state:paused] motion-reduce:animate-none',
            )}
            style={loops ? { animationDuration: `${track.length * SECONDS_PER_CARD}s` } : undefined}
          >
            {copy(false)}
            {loops && copy(true)}
          </div>
        </div>
      )}
    </section>
  );
}
