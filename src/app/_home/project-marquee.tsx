'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BondingProjectCard, BondingProjectCardSkeleton } from '@/features/launches/components/bonding-project-card';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { launchStatus } from './home-discovery';
import { launchHref, type HomeLaunch } from './use-home-launches';

const MAX_CARDS = 12;
/** Below this the row is static; a loop of two or three cards reads as a glitch, not a marquee. */
const MIN_LOOP = 4;
/** Each copy of the loop holds at least this many cards so it is wider than large screens. */
const MIN_TRACK = 8;
const SECONDS_PER_CARD = 6;

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
            <BondingProjectCard launch={launch} href={launchHref(launch, network)} status={launchStatus(launch)} />
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
          <Button variant="outline" size="sm" render={<Link href={`/projects?network=${network}`} />} nativeButton={false}>
            All projects <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {pending ? (
        <div role="status" aria-label="Loading projects" className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: 5 }, (_, index) => <BondingProjectCardSkeleton key={index} />)}
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
