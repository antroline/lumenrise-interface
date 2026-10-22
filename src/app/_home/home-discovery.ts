import type { LaunchListItem, Bonding } from '@/lib/api/launches/market';

export type HomeLaunch = LaunchListItem & { bonding: Bonding };

export function canParticipate(launch: HomeLaunch) {
  const b = launch.bonding;
  return b.status === 'Open' && !b.state.graduated &&
    b.progressBps < 10_000 && BigInt(b.state.sold) < BigInt(b.buckets.curve);
}

export type HomeStatus = 'Open' | 'Filled' | 'Scheduled' | 'Graduated' | 'Failed';

/** A full curve is "Filled" until the contract confirms graduation. */
export function launchStatus(launch: HomeLaunch): HomeStatus {
  const b = launch.bonding;
  if (b.status === 'Graduated' || b.state.graduated) return 'Graduated';
  if (b.status === 'Open' && b.progressBps >= 10_000) return 'Filled';
  return b.status;
}

/** Basis points retain their full hundredth-of-a-percent precision. */
export function progressLabel(progressBps: number) {
  return `${(progressBps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export function discoverLaunches(items: LaunchListItem[], now = Date.now()) {
  const launches = [...new Map(items.map((launch) => [launch.contractId, launch])).values()]
    .filter((launch): launch is HomeLaunch => launch.bonding !== null);
  const open = launches.filter((launch) =>
    launch.bonding.status === 'Open' && !launch.bonding.state.graduated,
  ).sort((a, b) => b.bonding.progressBps - a.bonding.progressBps);
  // Only elapsed, known trading openings establish recency; creation and indexing
  // times say nothing about when participation opened. This ranks the loaded page.
  const recent = launches.filter((launch) => {
    const startsAt = launch.bonding.startsAt;
    return launch.bonding.status !== 'Scheduled' && typeof startsAt === 'string' &&
      /^\d+$/.test(startsAt) && Number(startsAt) > 0 && Number(startsAt) * 1000 <= now;
  }).sort((a, b) => Number(b.bonding.startsAt) - Number(a.bonding.startsAt));
  return { launches, open, recent, featured: open.find(canParticipate) ?? launches[0] };
}
