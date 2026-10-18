import type { LaunchResult, MarketResult } from '@/lib/api/launches/market';
import type { ProjectColumn, SortDirection } from '@/lib/project-table';

export const directorySorts = [
  'trending',
  'newest',
  'volume',
  'graduation',
] as const;
export type DirectorySort = (typeof directorySorts)[number] | ProjectColumn;
export const categories = [
  'All',
  'Bonding Curve',
  'Auction',
  'Presale',
] as const;
export function directoryCategory(value?: string) {
  return (
    categories.find((item) => item.toLowerCase() === value?.toLowerCase()) ??
    (value === 'pre-sale' ? 'Presale' : 'All')
  );
}
export function directorySort(value?: string): DirectorySort {
  return [
    ...directorySorts,
    'name',
    'category',
    'phase',
    'figure',
    'participants',
    'date',
  ].includes(value ?? '')
    ? (value as DirectorySort)
    : 'newest';
}
export function selectDirectoryLaunches(
  launches: LaunchResult[],
  options: {
    category: string;
    search: string;
    sort: DirectorySort;
    direction: SortDirection;
    markets: Map<string, MarketResult>;
  },
) {
  const search = options.search.trim().toLocaleLowerCase('en-US');
  const rows = [
    ...new Map(
      launches.map((l) => [l.network + ':' + l.contractId, l]),
    ).values(),
  ].filter((l) => {
    if (
      options.category !== 'All' &&
      (options.category !== 'Bonding Curve' || !l.bonding)
    )
      return false;
    if (
      search &&
      ![l.metadata.name, l.metadata.symbol].some((s) =>
        s.toLocaleLowerCase('en-US').includes(search),
      )
    )
      return false;
    if (options.sort === 'graduation')
      return (
        l.bonding?.status === 'Open' &&
        !l.bonding.state.graduated &&
        BigInt(l.bonding.curve.graduationTarget) > BigInt(0)
      );
    return true;
  });
  function value(l: LaunchResult): string | number | bigint | null {
    const b = l.bonding;
    switch (options.sort) {
      case 'name':
        return l.metadata.name;
      case 'category':
        return b ? 'Bonding Curve' : null;
      case 'trending':
        return options.markets.get(l.contractId)?.volume24h.tradeCount ?? null;
      case 'participants':
        return b?.state.buyerCount ?? null;
      case 'graduation':
      case 'phase':
        return b && BigInt(b.curve.graduationTarget) > BigInt(0)
          ? b.progressBps
          : null;
      case 'figure':
        return b ? BigInt(b.state.quoteReserve) : null;
      case 'volume': {
        const market = options.markets.get(l.contractId);
        return market ? BigInt(market.volume24h.grossPairAmount) : null;
      }
      case 'date':
      case 'newest':
        return b ? BigInt(b.startsAt) : null;
    }
  }
  return rows.sort((a, b) => {
    // Different payment assets have no verified exchange rate. Group, never compare amounts.
    if (
      (options.sort === 'volume' || options.sort === 'figure') &&
      a.pair !== b.pair
    )
      return a.pair.localeCompare(b.pair);
    const left = value(a),
      right = value(b);
    if (left === null)
      return right === null ? a.contractId.localeCompare(b.contractId) : 1;
    if (right === null) return -1;
    const comparison =
      typeof left === 'string' && typeof right === 'string'
        ? left.localeCompare(right, 'en', { numeric: true })
        : left < right
          ? -1
          : left > right
            ? 1
            : 0;
    return (
      comparison * (options.direction === 'asc' ? 1 : -1) ||
      a.contractId.localeCompare(b.contractId)
    );
  });
}

export function directoryPage(total: number, requested: number, limit = 20) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pageCount, Number.isSafeInteger(requested) ? Math.max(1, requested) : 1);
  const offset = (page - 1) * limit;
  return { page, pageCount, offset };
}
