'use client';

import Link from 'next/link';
import { TokenLogo } from '@/components/token-logo';
import { useRevealed } from '@/features/launches/hooks/use-revealed';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import {
  launchHref,
  networkName,
  progressLabel,
  useHomeLaunches,
  type HomeLaunch,
} from './use-home-launches';

const LANES = 5;
const QUARTERS = [25, 50, 75];

// Narrow screens: name and percentage share the first row and the track spans the second.
const laneGrid =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem] md:gap-x-5';
const trackCell =
  'relative col-span-2 row-start-2 h-6 self-stretch md:col-span-1 md:col-start-2 md:row-start-1 md:h-auto';
const percentCell = 'col-start-2 row-start-1 md:col-start-3';

const utcTime = (millis: number) =>
  new Date(millis).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });

/** The measuring scale behind every lane: quarter marks, a baseline, and the graduation line at 100%. */
function Scale() {
  return (
    <>
      {QUARTERS.map((quarter) => (
        <span key={quarter} aria-hidden="true" className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${quarter}%` }} />
      ))}
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-white/[0.14]" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-chart-5" />
    </>
  );
}

function Lane({ launch, network, index }: { launch: HomeLaunch; network: ApiNetwork; index: number }) {
  const revealed = useRevealed();
  const filled = Math.max(0, Math.min(launch.bonding.progressBps / 100, 100));
  return (
    <li>
      <Link
        href={launchHref(launch, network)}
        className={cn(
          laneGrid,
          'group -mx-2 gap-y-1.5 rounded-lg px-2 py-2.5 transition-colors duration-200 outline-none hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-lime md:h-12 md:py-0',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="size-7 shrink-0 overflow-hidden rounded-[8px] bg-white/10 [&_img]:rounded-none">
            <TokenLogo logo={launch.metadata.logo} name={launch.metadata.name} seed={launch.contractId} size={28} />
          </span>
          <span className="min-w-0 truncate text-[14px] font-medium text-white underline-offset-4 group-hover:underline">
            {launch.metadata.name}
          </span>
          <span className="shrink-0 text-[12px] text-white/45">{launch.metadata.symbol}</span>
        </span>

        <span aria-hidden="true" className={trackCell}>
          <Scale />
          <span
            className="absolute top-1/2 left-0 h-1.5 origin-left rounded-full bg-linear-to-r from-lime/0 via-lime/50 to-lime transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{
              width: `${filled}%`,
              transform: `translateY(-50%) scaleX(${revealed ? 1 : 0})`,
              transitionDelay: `${index * 60}ms`,
            }}
          />
          <span
            className={cn(
              'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime ring-[3px] ring-panel transition-opacity duration-300 motion-reduce:transition-none',
              revealed ? 'opacity-100' : 'opacity-0',
            )}
            style={{ left: `${filled}%`, transitionDelay: `${700 + index * 60}ms` }}
          />
        </span>

        <span className={cn(percentCell, 'text-right text-[15px] font-semibold tracking-[-0.01em] text-white tabular-nums')}>
          {progressLabel(launch.bonding.progressBps)}
          <span className="sr-only"> of the graduation target</span>
        </span>
      </Link>
    </li>
  );
}

function Axis() {
  return (
    <div aria-hidden="true" className={cn(laneGrid, 'hidden text-[11px] text-white/40 tabular-nums md:grid')}>
      <span />
      <span className="relative h-4">
        <span className="absolute left-0">0</span>
        {QUARTERS.map((quarter) => (
          <span key={quarter} className="absolute -translate-x-1/2" style={{ left: `${quarter}%` }}>
            {quarter}
          </span>
        ))}
        {/* The dot sits on the graduation line below it. */}
        <span className="absolute right-0 flex translate-x-[3px] items-center gap-1.5 text-white/75">
          Graduation
          <span className="size-1.5 rounded-full bg-chart-5" />
        </span>
      </span>
      <span />
    </div>
  );
}

/** Open launches ranked by how far each has risen toward its graduation target. */
export function GraduationBoard({ network }: { network: ApiNetwork }) {
  const { query, open } = useHomeLaunches(network);
  const lanes = open.slice(0, LANES);

  return (
    <section aria-labelledby="graduation-board-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="graduation-board-heading" className="text-[15px] font-semibold text-white">
          Closest to graduation
        </h2>
        <p className="text-[12px] text-white/50 tabular-nums">
          {networkName(network)}
          {query.isSuccess && ` · updated ${utcTime(query.dataUpdatedAt)} UTC`}
        </p>
      </div>

      {query.isPending ? (
        <ul aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={cn(laneGrid, 'gap-y-1.5 py-2.5 md:h-12 md:py-0')}>
              <span className="flex items-center gap-2.5">
                <span className="size-7 rounded-[8px] bg-white/10" />
                <span className="h-3 w-24 rounded bg-white/10" />
              </span>
              <span className={trackCell}>
                <Scale />
              </span>
              <span className={cn(percentCell, 'ml-auto h-3.5 w-9 rounded bg-white/10')} />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-4">
          <p className="text-[13px] text-white/70">Launch data is unavailable right now.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex h-9 items-center rounded-lg border border-white/20 px-3 text-[13px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-lime focus-visible:outline-none disabled:opacity-50"
          >
            {query.isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      ) : lanes.length === 0 ? (
        <p className="rounded-lg border border-white/10 px-4 py-4 text-[13px] text-white/70">
          Nothing is trading right now.{' '}
          <Link href="/create" className="font-medium text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lime">
            Create a launch
          </Link>
        </p>
      ) : (
        <>
          <Axis />
          <ul>
            {lanes.map((launch, index) => (
              <Lane key={launch.contractId} launch={launch} network={network} index={index} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
