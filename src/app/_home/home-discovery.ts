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

export function discoverLaunches(items: LaunchListItem[]) {
  const launches = [...new Map(items.map((launch) => [launch.contractId, launch])).values()]
    .filter((launch): launch is HomeLaunch => launch.bonding !== null);
  const open = launches.filter((launch) =>
    launch.bonding.status === 'Open' && !launch.bonding.state.graduated,
  ).sort((a, b) => b.bonding.progressBps - a.bonding.progressBps);
  // Unknown creation times cannot establish recency. Trading starts and indexing
  // observations are deliberately not substituted for verified creation dates.
  const recent = launches.filter((launch) => launch.createdAt !== null &&
    Number.isFinite(Date.parse(launch.createdAt)),
  ).sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!));
  return { launches, open, recent, featured: open.find(canParticipate) ?? launches[0] };
}
