import {
  decodeConfig,
  decodeState,
  errorMessage,
  type Snapshot,
} from '../bonding/contract';
import type { Bonding, LaunchResult } from '@/lib/api/launches/market';

type DetailBonding = Omit<Bonding, 'version' | 'statusAsOf' | 'progressBps'>;

/** Prefer one live snapshot; never combine its state with an indexed status. */
export function bondingDetails(
  launch?: LaunchResult,
  snapshot?: Snapshot,
): DetailBonding | null {
  if (!snapshot) return launch?.bonding ?? null;
  const c = snapshot.config;
  const p = c.params;
  const s = snapshot.state;
  return {
    status: snapshot.status,
    stateStale: false,
    startsAt: p.starts_at.toString(),
    endsAt: p.ends_at?.toString() ?? null,
    totalSupply: c.total_supply.toString(),
    allocations: {
      curveBps: Number(p.allocations.curve_bps),
      poolBps: Number(p.allocations.pool_bps),
      teamBps: Number(p.allocations.team_bps),
    },
    buckets: {
      curve: c.buckets.curve.toString(),
      pool: c.buckets.pool.toString(),
      team: c.buckets.team.toString(),
    },
    vesting: {
      cliffSeconds: p.vesting.cliff_seconds.toString(),
      durationSeconds: p.vesting.duration_seconds.toString(),
      schedule: p.vesting.schedule,
    },
    curve: {
      graduationTarget: p.curve.graduation_target.toString(),
      virtualBaseReserve: p.curve.virtual_base_reserve.toString(),
      virtualQuoteReserve: p.curve.virtual_quote_reserve.toString(),
      creatorFeeBps: Number(p.curve.creator_fee_bps),
      creatorPayoutBps: Number(p.curve.creator_payout_bps),
      platformFeeBps: Number(c.platform_fee_bps),
    },
    state: {
      sold: s.sold.toString(),
      quoteReserve: s.quote_reserve.toString(),
      creatorFees: s.creator_fees.toString(),
      teamClaimed: s.team_claimed.toString(),
      buyerCount: Number(s.buyer_count),
      graduated: s.graduated,
    },
  };
}

export function indexedContract(launch?: LaunchResult) {
  if (!launch) return {};
  try {
    return {
      config: decodeConfig(launch.config),
      state: decodeState(launch.state),
    };
  } catch (cause) {
    // The validated bonding projection can still be displayed if raw configuration is unavailable.
    return { error: errorMessage(cause) };
  }
}

export function graduationPercent(
  reserve: string,
  target: string,
): number | null {
  if (BigInt(target) <= BigInt(0)) return null;
  const bps = (BigInt(reserve) * BigInt(10_000)) / BigInt(target);
  return bps <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bps) / 100 : null;
}

export function curveAvailability(
  b: DetailBonding | null,
  busy: boolean | undefined,
) {
  if (!b || busy !== false) return { buy: false, sell: false };
  return {
    buy: b.status === 'Open' && BigInt(b.state.sold) < BigInt(b.buckets.curve),
    sell:
      (b.status === 'Open' || b.status === 'Failed') &&
      BigInt(b.state.sold) > BigInt(0),
  };
}

/** The chart describes actual token buckets, including any integer rounding. */
export function allocationShare(amount: string, total: string): string {
  if (BigInt(total) <= BigInt(0)) return '—';
  return `${Number((BigInt(amount) * BigInt(100_000_000)) / BigInt(total)) / 1_000_000}%`;
}

export function durationLabel(seconds: string) {
  const value = BigInt(seconds);
  if (value === BigInt(0)) return 'none';
  if (value % BigInt(86400) === BigInt(0)) {
    const days = value / BigInt(86400);
    return `${days} ${days === BigInt(1) ? 'day' : 'days'}`;
  }
  return `${value} seconds`;
}

export function detailDate(seconds: string | null | undefined) {
  if (seconds == null) return 'Unavailable';
  const millis = BigInt(seconds) * BigInt(1000);
  if (millis < BigInt(0) || millis > BigInt(8_640_000_000_000_000))
    return 'Unavailable';
  return (
    new Date(Number(millis)).toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  );
}

export function detailAmount(raw: string | null | undefined, scale: number | null = 7) {
  if (raw == null || scale === null) return 'Unavailable';
  const units = BigInt(raw), unit = BigInt(10) ** BigInt(scale);
  const whole = (units / unit).toString();
  const fraction = scale === 0 ? '' : (units % unit).toString().padStart(scale, '0').replace(/0+$/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}
