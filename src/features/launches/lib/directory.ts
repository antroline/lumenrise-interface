import type { LaunchListFilters, LaunchSort } from '@/lib/api/launches/market';

export const directorySorts = [
  'trending',
  'newest',
  'topVolume',
  'almostGraduated',
] as const;
export type DirectorySort = LaunchSort;
export const launchSortLabels: Record<DirectorySort, string> = {
  trending: 'Trending',
  newest: 'Newest',
  topVolume: 'Top Volume',
  almostGraduated: 'Almost Graduated',
  name: 'Name',
  symbol: 'Symbol',
  category: 'Category',
  phase: 'Status',
  figure: 'Pool balance',
  participants: 'Participants',
  date: 'Created',
};
export const categories = ['All', 'Bonding Curve'] as const;
export function directoryCategory(
  value?: string,
): NonNullable<LaunchListFilters['category']> {
  const normalized = value?.toLowerCase();
  if (normalized === 'auction') return 'auction';
  if (normalized === 'pre-sale' || normalized === 'presale') return 'pre-sale';
  return normalized === 'bonding curve' || normalized === 'bonding-curve'
    ? 'bonding-curve'
    : 'all';
}
export function directorySort(value?: string): DirectorySort {
  if (value === 'volume') return 'topVolume';
  if (value === 'graduation') return 'almostGraduated';
  if (value === 'date') return 'newest';
  const sorts: LaunchSort[] = [
    ...directorySorts,
    'name',
    'symbol',
    'category',
    'phase',
    'figure',
    'participants',
  ];
  return sorts.find((sort) => sort === value) ?? 'newest';
}
export const monetarySort = (sort: string) =>
  sort === 'topVolume' || sort === 'figure';

export function directoryPage(total: number, requested: number, limit = 20) {
  const pageCount = Math.ceil(total / limit);
  const page = Math.min(
    Math.max(1, pageCount),
    Number.isSafeInteger(requested) ? Math.max(1, requested) : 1,
  );
  return { page, pageCount, offset: (page - 1) * limit };
}

export type DirectoryRequest = {
  network: 'testnet' | 'public';
  owner?: string;
  search: string;
  category: NonNullable<LaunchListFilters['category']>;
  sort: DirectorySort;
  direction: 'asc' | 'desc';
  pair?: string;
  page: number;
  limit: number;
};

/** Network and sorting are retained by Clear; a monetary sort also needs its asset scope. */
export function activeDirectoryFilterCount(request: DirectoryRequest) {
  return [
    request.search,
    request.owner,
    request.category !== 'all',
    request.pair && !monetarySort(request.sort),
    request.limit !== 20,
  ].filter(Boolean).length;
}
/** A control change always resets pagination; pagination itself preserves every filter. */
export function directoryHref(
  current: DirectoryRequest,
  changes: Partial<DirectoryRequest> = {},
) {
  const next = { ...current, ...changes, page: changes.page ?? 1 };
  const q = new URLSearchParams({
    network: next.network,
    category: next.category,
    sort: next.sort,
    direction: next.direction,
    page: String(next.page),
    limit: String(next.limit),
  });
  if (next.owner) q.set('owner', next.owner);
  if (next.search) q.set('search', next.search);
  if (next.pair) q.set('pair', next.pair);
  return `/launches?${q}`;
}
