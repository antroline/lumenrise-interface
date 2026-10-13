import { ApiError, apiRequest } from '../client';
import type { ApiNetwork } from './types';

export type ChartRange = '1D' | '1W' | '1M' | '3M' | 'ALL';
export type Bonding = {
  version: number;
  status: 'Scheduled' | 'Open' | 'Graduated' | 'Failed';
  statusAsOf: string;
  stateStale: boolean;
  startsAt: string;
  endsAt: string;
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
  asset: string;
  pair: string;
  metadata: { name: string; symbol: string; description: string; logo: string };
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  asOfLedger: number;
  observedAt: string;
  stateAsOfLedger: number;
  stateObservedAt: string;
  bonding: Bonding | null;
};
export type LaunchList = {
  launches: LaunchResult[];
  page: number;
  limit: number;
  total: number;
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
export type ChartResult = {
  network: ApiNetwork;
  contractId: string;
  asset: string;
  pair: string;
  range: ChartRange;
  intervalSeconds: number;
  priceScale: number;
  amountScale: number;
  priceType: 'marginal_before_fee';
  firstObservationAt: string | null;
  lastObservationAt: string | null;
  previousPrice: string | null;
  interpolation: 'step';
  items: {
    timestamp: string;
    open: string;
    close: string;
    high: string;
    low: string;
    count: number;
    firstObservedAt: string;
    lastObservedAt: string;
  }[];
};
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
      endsAt: raw(b.endsAt),
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
    asset: string(l.asset),
    pair: string(l.pair),
    metadata: {
      name: string(m.name),
      symbol: string(m.symbol),
      description: string(m.description),
      logo: string(m.logo),
    },
    config: object(l.config),
    state: object(l.state),
    asOfLedger: number(l.asOfLedger),
    observedAt: date(l.observedAt),
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
  const c = object(v),
    range = c.range;
  if (
    !['1D', '1W', '1M', '3M', 'ALL'].includes(string(range)) ||
    c.interpolation !== 'step'
  )
    invalid();
  const intervalSeconds = number(c.intervalSeconds);
  if (!intervalSeconds) invalid();
  return {
    network: network(c.network),
    contractId: string(c.contractId),
    asset: string(c.asset),
    pair: string(c.pair),
    range: range as ChartRange,
    intervalSeconds,
    priceScale: scale(c.priceScale),
    amountScale: scale(c.amountScale),
    priceType: priceType(c.priceType),
    firstObservationAt: nullable(c.firstObservationAt, date),
    lastObservationAt: nullable(c.lastObservationAt, date),
    previousPrice: nullable(c.previousPrice, raw),
    interpolation: 'step',
    items: array(c.items, (v) => {
      const i = object(v);
      return {
        timestamp: date(i.timestamp),
        open: raw(i.open),
        close: raw(i.close),
        high: raw(i.high),
        low: raw(i.low),
        count: number(i.count),
        firstObservedAt: date(i.firstObservedAt),
        lastObservedAt: date(i.lastObservedAt),
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
): Promise<LaunchList> {
  const q = new URLSearchParams({
    network: n,
    page: String(page),
    limit: String(limit),
  });
  if (owner) q.set('owner', owner);
  const r = object(await apiRequest<unknown>(`/launches?${q}`, { signal }));
  const launches = array(r.launches, decodeLaunch);
  if (launches.some((l) => l.network !== n)) invalid();
  return {
    launches,
    page: number(r.page),
    limit: number(r.limit),
    total: number(r.total),
  };
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
) {
  const result = identity(
    decodeChart(
      await apiRequest<unknown>(`${path(id, n, '/chart')}&range=${range}`, {
        signal,
      }),
    ),
    id,
    n,
  );
  return result.range === range ? result : invalid();
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
  const q = new URLSearchParams({ limit: String(filters.limit ?? 20) });
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
