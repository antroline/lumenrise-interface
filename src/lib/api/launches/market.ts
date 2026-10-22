import { getConfiguration } from '../config';
import { ApiError, apiRequest } from '../client';
import type { ApiNetwork } from './types';
import { decodePublicTeamMember, type PublicTeamMember } from './team';

export type ChartRange = '1D' | '1W' | '1M' | '3M' | 'ALL';
export type Bonding = {
  version: number;
  status: 'Scheduled' | 'Open' | 'Graduated' | 'Failed';
  statusAsOf: string;
  stateStale: boolean;
  startsAt: string;
  endsAt: string | null;
  totalSupply: string;
  allocations: { poolBps: number; curveBps: number; teamBps: number };
  buckets: { pool: string; curve: string; team: string };
  vesting: { cliffSeconds: string; durationSeconds: string; schedule: string };
  curve: {
    graduationTarget: string;
    virtualBaseReserve: string;
    virtualQuoteReserve: string;
    creatorFeeBps: number;
    creatorPayoutBps: number;
    platformFeeBps: number;
  };
  state: {
    sold: string;
    quoteReserve: string;
    creatorFees: string;
    teamClaimed: string;
    buyerCount: number;
    graduated: boolean;
  };
  progressBps: number;
};
export type LaunchResult = {
  network: ApiNetwork;
  factoryContractId: string;
  factoryIndex: number;
  contractId: string;
  owner: string;
  team?: PublicTeamMember[];
  asset: string;
  pair: string;
  metadata: { name: string; symbol: string; description: string; logo: string; website?: string; xAccount?: string; github?: string };
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  asOfLedger: number;
  observedAt: string;
  /** Verified contract creation, never the indexing or trading opening time. */
  createdAt: string | null;
  creationLedger: number | null;
  creationTransactionHash: string | null;
  stateAsOfLedger: number;
  stateObservedAt: string;
  bonding: Bonding | null;
};
export type LaunchSort =
  | 'newest' | 'name' | 'symbol' | 'trending' | 'topVolume'
  | 'almostGraduated' | 'participants' | 'figure' | 'date' | 'phase' | 'category';
export type LaunchListFilters = {
  search?: string;
  category?: 'all' | 'bonding-curve' | 'auction' | 'pre-sale';
  sort?: LaunchSort;
  direction?: 'asc' | 'desc';
  pair?: string;
};
export type LaunchListItem = LaunchResult & {
  category: 'bonding-curve';
  amountScale: number;
  volume24h: MarketResult['volume24h'];
};
export type LaunchList = {
  launches: LaunchListItem[];
  page: number;
  limit: number;
  total: number;
  sort: LaunchSort;
  direction: 'asc' | 'desc';
  dateMeaning: 'contract_creation';
  statsAsOf: string;
  statsSince: string;
  statsCoverage: 'verified_client_submitted_trades';
};
export type MarketResult = {
  network: ApiNetwork;
  contractId: string;
  asset: string;
  pair: string;
  amountScale: number;
  priceScale: number;
  currentPrice: string | null;
  priceObservedAt: string | null;
  priceType: 'marginal_before_fee';
  stateAsOfLedger: number;
  stateObservedAt: string;
  stateStale: boolean;
  curveReserve: string;
  netTokensSold: string;
  distinctBuyers: number;
  volume24h: {
    grossPairAmount: string;
    assetAmount: string;
    tradeCount: number;
    buyCount: number;
    sellCount: number;
  };
};
export const chartTimeframes = {
  '1D': '15m', '1W': '4h', '1M': '1d', '3M': '1w', ALL: '1d',
} as const;
export function getChartRanges(): ChartRange[] {
  const rule = getConfiguration().rules.chart;
  return rule.maxTimeframes < 1 ? [] : (Object.keys(chartTimeframes) as ChartRange[])
    .filter(range => rule.legacyRanges.includes(range) && rule.timeframes.includes(chartTimeframes[range]));
}
export type Candle = {
  timestamp: string;
  endsAt: string;
  open: string;
  high: string;
  low: string;
  close: string | null;
  latestPrice: string;
  complete: boolean;
  partial: boolean;
  count: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
};
export type ChartResult = {
  network: ApiNetwork;
  contractId: string;
  asset: string;
  pair: string;
  priceScale: number;
  amountScale: number;
  priceType: 'marginal_before_fee';
  firstObservationAt: string | null;
  lastObservationAt: string | null;
  asOf: string;
  timeframes: {
    timeframe: string;
    timezone: 'UTC';
    items: Candle[];
    hasMore: boolean;
    nextBefore: string | null;
  }[];
};
export type ChartHistory = ChartResult & { items: Candle[]; from: string | null };

/** Subtract calendar months in UTC, clamping to the target month's last day. */
export function chartFrom(range: ChartRange, referenceTime = Date.now()): string | null {
  if (range === 'ALL') return null;
  if (range === '1D' || range === '1W')
    return new Date(referenceTime - (range === '1D' ? 1 : 7) * 86400000).toISOString();
  const start = new Date(referenceTime);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - (range === '1M' ? 1 : 3));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return start.toISOString();
}
export type TradeResult = {
  trader: string;
  tradedAt: string;
  asset: string;
  side: 'buy' | 'sell';
  assetAmount: string;
  executionPrice: string;
};
export type TradesResult = {
  items: TradeResult[];
  nextCursor: string | null;
  pair: string;
  amountScale: number;
  priceScale: number;
};

function invalid(): never {
  throw new ApiError(
    'The server returned invalid launch data.',
    'invalid-response',
  );
}
function object(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : invalid();
}
function string(v: unknown): string {
  return typeof v === 'string' ? v : invalid();
}
function raw(v: unknown): string {
  const s = string(v);
  return /^\d+$/.test(s) ? s : invalid();
}
function number(v: unknown): number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
    ? v
    : invalid();
}
function bps(v: unknown): number {
  const n = typeof v === 'string' ? Number(raw(v)) : number(v);
  return Number.isSafeInteger(n) && n >= 0 ? n : invalid();
}
function boolean(v: unknown): boolean {
  return typeof v === 'boolean' ? v : invalid();
}
function date(v: unknown): string {
  const s = string(v);
  return Number.isFinite(Date.parse(s)) ? s : invalid();
}
function nullable<T>(v: unknown, decode: (v: unknown) => T): T | null {
  return v === null ? null : decode(v);
}
function array<T>(v: unknown, decode: (v: unknown) => T): T[] {
  return Array.isArray(v) ? v.map(decode) : invalid();
}
function network(v: unknown): ApiNetwork {
  return v === 'testnet' || v === 'public' ? v : invalid();
}
function priceType(v: unknown): 'marginal_before_fee' {
  return v === 'marginal_before_fee' ? v : invalid();
}
function scale(v: unknown) {
  return number(v) === 7 ? 7 : invalid();
}
export function decodeLaunch(v: unknown): LaunchResult {
  const l = object(v),
    m = object(l.metadata);
  let bonding: Bonding | null = null;
  if (l.bonding !== null) {
    const b = object(l.bonding),
      a = object(b.allocations),
      k = object(b.buckets),
      t = object(b.vesting),
      c = object(b.curve),
      s = object(b.state);
    const status = b.status;
    if (
      status !== 'Scheduled' &&
      status !== 'Open' &&
      status !== 'Graduated' &&
      status !== 'Failed'
    )
      invalid();
    bonding = {
      version: bps(b.version),
      status,
      statusAsOf: string(b.statusAsOf),
      stateStale: boolean(b.stateStale),
      startsAt: raw(b.startsAt),
      endsAt: nullable(b.endsAt, raw),
      totalSupply: raw(b.totalSupply),
      allocations: {
        poolBps: bps(a.poolBps),
        curveBps: bps(a.curveBps),
        teamBps: bps(a.teamBps),
      },
      buckets: { pool: raw(k.pool), curve: raw(k.curve), team: raw(k.team) },
      vesting: {
        cliffSeconds: raw(t.cliffSeconds),
        durationSeconds: raw(t.durationSeconds),
        schedule: string(t.schedule),
      },
      curve: {
        graduationTarget: raw(c.graduationTarget),
        virtualBaseReserve: raw(c.virtualBaseReserve),
        virtualQuoteReserve: raw(c.virtualQuoteReserve),
        creatorFeeBps: bps(c.creatorFeeBps),
        creatorPayoutBps: bps(c.creatorPayoutBps),
        platformFeeBps: bps(c.platformFeeBps),
      },
      state: {
        sold: raw(s.sold),
        quoteReserve: raw(s.quoteReserve),
        creatorFees: raw(s.creatorFees),
        teamClaimed: raw(s.teamClaimed),
        buyerCount: bps(s.buyerCount),
        graduated: boolean(s.graduated),
      },
      progressBps: bps(b.progressBps),
    };
  }
  return {
    network: network(l.network),
    contractId: string(l.contractId),
    factoryContractId: string(l.factoryContractId),
    factoryIndex: number(l.factoryIndex),
    owner: string(l.owner),
    team: l.team == null ? [] : array(l.team, decodePublicTeamMember),
    asset: string(l.asset),
    pair: string(l.pair),
    metadata: {
      name: string(m.name),
      symbol: string(m.symbol),
      description: string(m.description),
      logo: string(m.logo),
      website: typeof m.website === 'string' ? m.website : undefined,
      xAccount: typeof m.xAccount === 'string' ? m.xAccount : undefined,
      github: typeof m.github === 'string' ? m.github : undefined,
    },
    config: object(l.config),
    state: object(l.state),
    asOfLedger: number(l.asOfLedger),
    observedAt: date(l.observedAt),
    createdAt: nullable(l.createdAt, date),
    creationLedger: nullable(l.creationLedger, number),
    creationTransactionHash: nullable(l.creationTransactionHash, string),
    stateAsOfLedger: number(l.stateAsOfLedger),
    stateObservedAt: date(l.stateObservedAt),
    bonding,
  };
}
export function decodeMarket(v: unknown): MarketResult {
  const m = object(v),
    vol = object(m.volume24h);
  return {
    network: network(m.network),
    contractId: string(m.contractId),
    asset: string(m.asset),
    pair: string(m.pair),
    amountScale: scale(m.amountScale),
    priceScale: scale(m.priceScale),
    currentPrice: nullable(m.currentPrice, raw),
    priceObservedAt: nullable(m.priceObservedAt, date),
    priceType: priceType(m.priceType),
    stateAsOfLedger: number(m.stateAsOfLedger),
    stateObservedAt: date(m.stateObservedAt),
    stateStale: boolean(m.stateStale),
    curveReserve: raw(m.curveReserve),
    netTokensSold: raw(m.netTokensSold),
    distinctBuyers: number(m.distinctBuyers),
    volume24h: {
      grossPairAmount: raw(vol.grossPairAmount),
      assetAmount: raw(vol.assetAmount),
      tradeCount: number(vol.tradeCount),
      buyCount: number(vol.buyCount),
      sellCount: number(vol.sellCount),
    },
  };
}
export function decodeChart(v: unknown): ChartResult {
  const c = object(v);
  return {
    network: network(c.network),
    contractId: string(c.contractId),
    asset: string(c.asset),
    pair: string(c.pair),
    priceScale: scale(c.priceScale),
    amountScale: scale(c.amountScale),
    priceType: priceType(c.priceType),
    asOf: date(c.asOf),
    firstObservationAt: nullable(c.firstObservationAt, date),
    lastObservationAt: nullable(c.lastObservationAt, date),
    timeframes: array(c.timeframes, (v) => {
      const frame = object(v);
      if (frame.timezone !== 'UTC') invalid();
      return {
        timeframe: string(frame.timeframe),
        timezone: 'UTC',
        hasMore: boolean(frame.hasMore),
        nextBefore: nullable(frame.nextBefore, date),
        items: array(frame.items, (v) => {
          const i = object(v);
          return {
            timestamp: date(i.timestamp),
            endsAt: date(i.endsAt),
            open: raw(i.open),
            close: nullable(i.close, raw),
            latestPrice: raw(i.latestPrice),
            high: raw(i.high),
            low: raw(i.low),
            complete: boolean(i.complete),
            partial: boolean(i.partial),
            count: number(i.count),
            firstObservedAt: nullable(i.firstObservedAt, date),
            lastObservedAt: nullable(i.lastObservedAt, date),
          };
        }),
      };
    }),
  };
}
export function decodeTrade(v: unknown): TradeResult {
  const t = object(v);
  if (t.side !== 'buy' && t.side !== 'sell') invalid();
  return {
    trader: string(t.trader),
    tradedAt: date(t.tradedAt),
    asset: string(t.asset),
    side: t.side,
    assetAmount: raw(t.assetAmount),
    executionPrice: raw(t.executionPrice),
  };
}
export function decodeTrades(v: unknown): TradesResult {
  const t = object(v);
  return {
    items: array(t.items, decodeTrade),
    nextCursor: nullable(t.nextCursor, string),
    pair: string(t.pair),
    amountScale: scale(t.amountScale),
    priceScale: scale(t.priceScale),
  };
}
const path = (id: string, n: ApiNetwork, section = '') =>
  `/launches/${encodeURIComponent(id)}${section}?network=${n}`;
export async function getLaunchList(
  n: ApiNetwork,
  page: number,
  limit: number,
  owner?: string,
  signal?: AbortSignal,
  filters: LaunchListFilters = {},
): Promise<LaunchList> {
  const rule = getConfiguration().rules.launches;
  if (
    !Number.isSafeInteger(page) || page < rule.minPage || page > rule.maxPage ||
    !Number.isSafeInteger(limit) || limit < rule.minLimit || limit > rule.maxLimit ||
    (filters.search?.length ?? 0) > rule.searchMaxLength ||
    !rule.categories.includes(filters.category ?? rule.defaultCategory) ||
    !rule.sorts.includes(filters.sort ?? rule.defaultSort) ||
    !rule.directions.includes(filters.direction ?? rule.defaultDirection) ||
    (rule.pairRequiredSorts.includes(filters.sort ?? rule.defaultSort) && !filters.pair)
  )
    throw new ApiError('Invalid launch filters for the current server configuration.', 'http', { status: 400 });
  const q = new URLSearchParams({
    network: n,
    page: String(page),
    limit: String(limit),
    category: filters.category ?? rule.defaultCategory,
    sort: filters.sort ?? rule.defaultSort,
    direction: filters.direction ?? rule.defaultDirection,
  });
  if (owner) q.set('owner', owner);
  if (filters.search) q.set('search', filters.search);
  if (filters.pair) q.set('pair', filters.pair);
  const r = object(await apiRequest<unknown>(`/launches?${q}`, { signal }));
  const launches = array(r.launches, (value): LaunchListItem => {
    const item = object(value),
      vol = object(item.volume24h);
    if (item.category !== 'bonding-curve') invalid();
    return {
      ...decodeLaunch(item),
      category: item.category,
      amountScale: scale(item.amountScale),
      volume24h: {
        grossPairAmount: raw(vol.grossPairAmount),
        assetAmount: raw(vol.assetAmount),
        tradeCount: number(vol.tradeCount),
        buyCount: number(vol.buyCount),
        sellCount: number(vol.sellCount),
      },
    };
  });
  if (launches.some((l) => l.network !== n || (filters.pair && l.pair !== filters.pair)))
    invalid();
  if (r.page !== page || r.limit !== limit) invalid();
  const sorts: LaunchSort[] = [
    'newest', 'name', 'symbol', 'trending', 'topVolume', 'almostGraduated',
    'participants', 'figure', 'date', 'phase', 'category',
  ];
  const sort = sorts.find((value) => value === r.sort);
  if (
    !sort ||
    (r.direction !== 'asc' && r.direction !== 'desc') ||
    r.dateMeaning !== 'contract_creation' ||
    r.statsCoverage !== 'verified_client_submitted_trades'
  ) invalid();
  return {
    launches,
    page: number(r.page),
    limit: number(r.limit),
    total: number(r.total),
    sort,
    direction: r.direction,
    dateMeaning: r.dateMeaning,
    statsAsOf: date(r.statsAsOf),
    statsSince: date(r.statsSince),
    statsCoverage: r.statsCoverage,
  };
}

/** Defaults are explicit so every consumer shares only identical requests. */
export function launchListKey(
  network: ApiNetwork,
  page = getConfiguration().rules.launches.minPage,
  limit = getConfiguration().rules.launches.defaultLimit,
  owner?: string,
  filters: LaunchListFilters = {},
) {
  return ['launch-list', {
    network,
    owner: owner ?? '',
    search: filters.search ?? '',
    category: filters.category ?? getConfiguration().rules.launches.defaultCategory,
    sort: filters.sort ?? getConfiguration().rules.launches.defaultSort,
    direction: filters.direction ?? getConfiguration().rules.launches.defaultDirection,
    pair: filters.pair ?? '',
    page,
    limit,
  }] as const;
}
function identity<T extends { network: ApiNetwork; contractId: string }>(
  result: T,
  id: string,
  n: ApiNetwork,
): T {
  return result.network === n && result.contractId === id ? result : invalid();
}
export async function getLaunchDetail(
  id: string,
  n: ApiNetwork,
  signal?: AbortSignal,
) {
  return identity(
    decodeLaunch(await apiRequest<unknown>(path(id, n), { signal })),
    id,
    n,
  );
}
export async function getMarket(
  id: string,
  n: ApiNetwork,
  signal?: AbortSignal,
) {
  return identity(
    decodeMarket(await apiRequest<unknown>(path(id, n, '/market'), { signal })),
    id,
    n,
  );
}
export async function getChart(
  id: string,
  n: ApiNetwork,
  range: ChartRange,
  signal?: AbortSignal,
  referenceTime = Date.now(),
): Promise<ChartHistory> {
  const rule = getConfiguration().rules.chart;
  const timeframe = chartTimeframes[range];
  if (!rule.legacyRanges.includes(range) || !rule.timeframes.includes(timeframe) || rule.maxTimeframes < 1) throw new ApiError('This chart timeframe is not available in server configuration.', 'http', { status: 400 });
  const from = chartFrom(range, referenceTime);
  async function page(to?: string) {
    signal?.throwIfAborted();
    const query = new URLSearchParams({ network: n, timeframes: timeframe, limit: String(rule.defaultLimit) });
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const result = identity(decodeChart(await apiRequest<unknown>(
      `/launches/${encodeURIComponent(id)}/chart?${query}`, { signal },
    )), id, n);
    signal?.throwIfAborted();
    const frame = result.timeframes.find((entry) => entry.timeframe === timeframe);
    if (!frame) invalid();
    return { result, frame };
  }
  const initial = await page();
  let frame = initial.frame;
  let boundary = initial.result.asOf;
  const candles = new Map<number, Candle>();
  const append = (items: Candle[]) => {
    // Keep the newer page's candle when pagination boundaries overlap.
    for (const item of items) {
      const time = Date.parse(item.timestamp);
      if (!candles.has(time)) candles.set(time, item);
    }
  };
  append(frame.items);
  while (range === 'ALL' && frame.hasMore) {
    const next = frame.nextBefore;
    if (!next || Date.parse(next) >= Date.parse(boundary))
      throw new ApiError('Price history pagination did not advance. Try again.', 'invalid-response');
    boundary = next;
    const older = await page(next);
    append(older.frame.items);
    frame = older.frame;
  }
  return {
    ...initial.result,
    from,
    items: [...candles.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
  };
}
export async function getTrades(
  id: string,
  n: ApiNetwork,
  filters: {
    cursor?: string;
    trader?: string;
    side?: 'buy' | 'sell';
    limit?: number;
  },
  signal?: AbortSignal,
) {
  const rule = getConfiguration().rules.trades;
  const limit = filters.limit ?? rule.defaultLimit;
  if (
    !Number.isSafeInteger(limit) || limit < rule.minLimit || limit > rule.maxLimit ||
    (filters.cursor?.length ?? 0) > rule.cursorMaxLength ||
    (filters.side && !rule.sides.includes(filters.side))
  ) throw new ApiError('Invalid trade filters.', 'http', { status: 400 });
  const q = new URLSearchParams({ limit: String(limit) });
  if (filters.cursor) q.set('cursor', filters.cursor);
  if (filters.trader) q.set('trader', filters.trader);
  if (filters.side) q.set('side', filters.side);
  return decodeTrades(
    await apiRequest<unknown>(`${path(id, n, '/trades')}&${q}`, { signal }),
  );
}
export async function recordTrade(
  id: string,
  n: ApiNetwork,
  transactionHash: string,
  signal?: AbortSignal,
) {
  const r = object(
    await apiRequest<unknown>(path(id, n, '/trades'), {
      method: 'POST',
      user: true,
      expectedStatus: 200,
      json: { transactionHash },
      signal,
    }),
  );
  return {
    trade: decodeTrade(r.trade),
    pair: string(r.pair),
    amountScale: scale(r.amountScale),
    priceScale: scale(r.priceScale),
  };
}
