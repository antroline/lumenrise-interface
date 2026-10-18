'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ProjectsTable,
  ProjectsTableSkeleton,
} from '@/components/projects-table';
import { ResultsLink } from '@/components/results-transition';
import { Button } from '@/components/ui/button';
import { MobileProjectList, MobileProjectListSkeleton } from './mobile-project-list';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { getLaunchList, type MarketResult } from '@/lib/api/launches/market';
import {
  compactAmount,
  displayAmount,
  pairLabel,
} from '@/lib/api/launches/display';
import {
  publicQueryOptions,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import {
  projectColumns,
  type ProjectColumn,
  type SortDirection,
  type ProjectPhase,
  type ProjectTableRow,
} from '@/lib/project-table';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';
import {
  categories,
  directoryCategory,
  directorySort,
  directorySorts,
  directoryPage,
  selectDirectoryLaunches,
  type DirectorySort,
} from '../lib/directory';
import {
  DIRECTORY_MAX_MARKETS,
  DIRECTORY_PAGE_SIZE,
  getDirectory,
  getDirectoryMarkets,
} from '../lib/directory-data';

const phases = {
  Scheduled: 'upcoming',
  Open: 'live',
  Graduated: 'launched',
  Failed: 'failed',
} satisfies Record<string, ProjectPhase>;
const sortLabels: Partial<Record<DirectorySort, string>> = {
  trending: 'Trending',
  newest: 'Newest',
  volume: 'Top Volume',
  graduation: 'Almost Graduated',
};
const controlClass =
  'inline-flex h-7.5 min-h-7.5 min-w-0 items-center justify-center rounded-sm px-0 text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-foreground min-[375px]:text-[12.5px] lg:h-8 lg:min-h-0 lg:shrink-0 lg:rounded-md lg:px-3 lg:text-xs lg:pointer-coarse:min-h-11';
const activeClass =
  'bg-white text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50';
const inactiveClass =
  'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50';

function directoryDate(seconds?: string) {
  if (!seconds) return {};
  const ms = BigInt(seconds) * BigInt(1000);
  if (ms > BigInt(8_640_000_000_000_000)) return {};
  const date = new Date(Number(ms));
  return {
    short: date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    full: date.toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long',
    }),
  };
}

export function PublicProjects({
  network,
  page,
  owner,
  category: categoryParam,
  sort: sortParam,
  direction,
  search = '',
  showMobileProgress = false,
}: {
  network: ApiNetwork;
  page: number;
  owner?: string;
  category?: string;
  sort?: string;
  direction?: string;
  search?: string;
  showMobileProgress?: boolean;
}) {
  const visible = usePageVisible();
  const router = useRouter();
  const client = useQueryClient();
  const category = directoryCategory(categoryParam);
  const requestedSort = directorySort(sortParam);
  const selectedDirection: SortDirection = direction === 'asc' ? 'asc' : 'desc';
  const catalog = useQuery({
    ...publicQueryOptions,
    queryKey: ['directory', network, owner ?? ''],
    queryFn: ({ signal }) => getDirectory(network, owner, signal),
    enabled: visible,
    retry: false,
  });
  const complete = catalog.data?.complete ?? false;
  const serverPagination = directoryPage(catalog.data?.total ?? 0, page);
  const pageQuery = useQuery({
    ...publicQueryOptions,
    queryKey: ['launch-list', network, owner ?? '', serverPagination.page],
    queryFn: ({ signal }) =>
      getLaunchList(
        network,
        serverPagination.page,
        DIRECTORY_PAGE_SIZE,
        owner,
        signal,
      ),
    enabled:
      visible && !!catalog.data && !complete && serverPagination.page > 1,
  });
  const query =
    catalog.data && !complete && serverPagination.page > 1
      ? pageQuery
      : catalog;
  const launches = query.data?.launches ?? [];
  const recentSupported = complete && launches.length <= DIRECTORY_MAX_MARKETS;
  const volumeSupported =
    recentSupported && new Set(launches.map((l) => l.pair)).size <= 1;
  const rankingUnavailable =
    (requestedSort === 'trending' && !recentSupported) ||
    (requestedSort === 'volume' && !volumeSupported);
  const sort = rankingUnavailable ? 'newest' : requestedSort;
  const recentRanking = sort === 'volume' || sort === 'trending';
  const metrics = useQuery({
    ...publicQueryOptions,
    queryKey: [
      'directory-markets',
      network,
      launches
        .map((l) => l.contractId)
        .sort()
        .join(','),
    ],
    queryFn: ({ signal }) => getDirectoryMarkets(launches, network, signal),
    enabled: visible && recentSupported && recentRanking && launches.length > 0,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  useEffect(() => {
    if (!visible) {
      void client.cancelQueries({
        queryKey: ['directory', network, owner ?? ''],
      });
      void client.cancelQueries({
        queryKey: ['launch-list', network, owner ?? '', serverPagination.page],
      });
      void client.cancelQueries({ queryKey: ['directory-markets', network] });
    }
  }, [visible, client, network, owner, serverPagination.page]);
  const markets = metrics.data ?? new Map<string, MarketResult>();
  const volumePending =
    recentRanking && launches.length > 0 && metrics.isPending;
  const rankingError = recentRanking && metrics.isError && !metrics.data;
  const filtered = selectDirectoryLaunches(launches, {
    category,
    search,
    sort,
    direction: selectedDirection,
    markets,
  });
  const total = complete ? filtered.length : (catalog.data?.total ?? 0);
  const pagination = directoryPage(total, page);
  const currentPage = pagination.page;
  const pageCount = pagination.pageCount;
  const limit = DIRECTORY_PAGE_SIZE;
  const pageLaunches = complete
    ? filtered.slice(pagination.offset, pagination.offset + limit)
    : filtered;
  const rows: (ProjectTableRow & { href: string })[] = pageLaunches.map((l) => {
    const b = l.bonding,
      pair = pairLabel(l.pair, network);
    const date = directoryDate(b?.startsAt);
    const amount = b?.state.quoteReserve;
    const website = safeExternalUrl(l.metadata.website);
    const xUrl = safeExternalUrl(l.metadata.xAccount);
    const xAccount =
      xUrl &&
      ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(
        new URL(xUrl).hostname,
      )
        ? xUrl
        : undefined;
    const format = (raw: string) =>
      BigInt(raw) > BigInt(0) && BigInt(raw) < BigInt(100000)
        ? displayAmount(raw)
        : compactAmount(raw);
    return {
      id: `${network}:${l.contractId}`,
      name: l.metadata.name,
      ticker: l.metadata.symbol,
      logo: l.metadata.logo,
      website,
      xAccount,
      href: `/launch/${l.contractId}?network=${network}`,
      category: b ? 'Bonding Curve' : '—',
      phase: b ? phases[b.status] : 'unavailable',
      graduation: b
        ? {
            target:
              BigInt(b.curve.graduationTarget) > BigInt(0)
                ? format(b.curve.graduationTarget) + ' ' + pair
                : '—',
            targetTitle: displayAmount(b.curve.graduationTarget) + ' ' + pair,
            progressBps: b.progressBps,
            stale: b.stateStale,
            graduated: b.status === 'Graduated' || b.state.graduated,
            status:
              BigInt(b.curve.graduationTarget) === BigInt(0)
                ? 'Target unavailable'
                : b.status,
          }
        : undefined,
      figure: amount === undefined ? '—' : format(amount) + ' ' + pair,
      figureTitle:
        amount === undefined
          ? 'Metric unavailable'
          : displayAmount(amount) + ' ' + pair + ' · indexed curve reserve',
      figureContext: '',
      participants: b?.state.buyerCount ?? null,
      date: date.short ?? '—',
      dateTitle: date.full,
      dateLabel: date.short ? 'opens · UTC' : undefined,
    };
  });
  function href(
    nextPage: number,
    nextSort: DirectorySort = sort,
    nextDirection = selectedDirection,
    nextCategory = category,
    nextSearch = search,
  ) {
    const q = new URLSearchParams({
      network,
      livePage: String(nextPage),
      category: nextCategory,
      sort: nextSort,
      dir: nextDirection,
    });
    if (owner) q.set('owner', owner);
    if (nextSearch) q.set('q', nextSearch);
    return `/launches?${q}`;
  }
  const canonicalHref = href(currentPage, sort);
  useEffect(() => {
    if (
      catalog.data &&
      !query.isPending &&
      (currentPage !== page || rankingUnavailable)
    )
      router.replace(canonicalHref, { scroll: false });
  }, [
    catalog.data,
    query.isPending,
    currentPage,
    page,
    rankingUnavailable,
    canonicalHref,
    router,
  ]);
  const selectedColumn: ProjectColumn | undefined =
    sort === 'graduation'
      ? 'phase'
      : sort === 'trending' || sort === 'volume'
        ? undefined
        : sort === 'newest'
          ? 'date'
          : sort;
  const sorting = {
    column: selectedColumn,
    direction: selectedDirection,
    explicit: true,
    link: (column: ProjectColumn) => {
      const next: SortDirection =
        column === selectedColumn
          ? selectedDirection === 'asc'
            ? 'desc'
            : 'asc'
          : column === 'name' || column === 'category'
            ? 'asc'
            : 'desc';
      // The active header reverses the primary ranking without changing its metric.
      const nextSort = column === selectedColumn ? sort : column;
      return { href: href(1, nextSort, next), direction: next };
    },
  };
  const figureLabel = 'Pool balance';
  return (
    <section
      className="mb-8 flex min-w-0 flex-col gap-4"
      aria-label="Project directory"
      aria-busy={query.isPending || volumePending}
    >
      <div className="-mx-2 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:-mx-3 lg:mx-0">
        <nav
          aria-label="Launch category"
          className="hidden w-full min-w-0 max-w-full rounded-lg bg-neutral-200/60 p-1 lg:block lg:w-auto lg:overflow-x-auto dark:bg-neutral-800"
        >
          <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1 lg:flex lg:w-max">
            {categories.map((item) => (
              <ResultsLink
                key={item}
                href={href(1, sort, selectedDirection, item)}
                scroll={false}
                aria-current={item === category ? 'page' : undefined}
                className={cn(
                  controlClass,
                  item === category ? activeClass : inactiveClass,
                )}
              >
                {item}
              </ResultsLink>
            ))}
          </div>
        </nav>
        <nav
          aria-label="Project sorting"
          className="w-full min-w-0 max-w-full lg:ml-auto lg:w-auto lg:overflow-x-auto"
        >
          <div className="grid grid-cols-3 items-center gap-1 rounded-md bg-neutral-200/60 p-1 lg:flex lg:w-max lg:rounded-none lg:bg-transparent lg:p-0 dark:bg-neutral-800 lg:dark:bg-transparent">
            <span className="mr-2 hidden text-xs text-neutral-600 lg:inline dark:text-neutral-400">
              Sort by
            </span>
            {directorySorts.map((item) => {
              const disabled =
                item === 'volume'
                  ? !volumeSupported
                  : item === 'trending' && !recentSupported;
              const reason =
                item === 'volume' && recentSupported
                  ? 'Volume cannot be compared across payment assets.'
                  : `Recent rankings require a complete directory of ${DIRECTORY_MAX_MARKETS} projects or fewer.`;
              return disabled ? (
                <button
                  key={item}
                  type="button"
                  disabled
                  title={reason}
                  className={cn(
                    controlClass,
                    inactiveClass,
                    item === 'volume' && 'hidden lg:inline-flex',
                    'cursor-not-allowed opacity-50',
                  )}
                >
                  {sortLabels[item]}
                </button>
              ) : (
                <ResultsLink
                  key={item}
                  href={href(1, item, 'desc')}
                  scroll={false}
                  aria-current={sort === item ? 'page' : undefined}
                  className={cn(
                    controlClass,
                    item === 'volume' && 'hidden lg:inline-flex',
                    sort === item ? activeClass : inactiveClass,
                  )}
                >
                  {sortLabels[item]}
                </ResultsLink>
              );
            })}
          </div>
        </nav>
        {/* <p
          className="text-xs leading-5 text-neutral-600 dark:text-neutral-400"
          id="directory-scope"
        >
          {catalog.data && !complete &&
            'Large directory: search, categories and sorting apply to this page only. '}
          {sort === 'trending' && 'Trending ranks recorded trades in the last 24 hours. '}
          {sort === 'newest' && 'Newest ranks by scheduled opening time. '}
          {sort === 'volume' && 'Ranked by recorded gross volume in the last 24 hours. '}
          {sort === 'figure' && 'Balances ranked within each payment asset. '}
          {sort === 'graduation' &&
            'Open bonding curves with a known target only. '}
          {catalog.data && !recentSupported && 'Recent rankings are unavailable for larger directories. '}
          {recentSupported && !volumeSupported && 'Top Volume is unavailable across different payment assets.'}
        </p> */}
      </div>
      {catalog.data && !complete && (
        <p className="text-xs text-muted-foreground lg:hidden">
          Search, categories and sorting apply to this page only. Recent rankings are unavailable for larger directories.
        </p>
      )}
      <div
        className="@container -mx-4 min-w-0 border-y border-neutral-200 bg-white sm:-mx-5 lg:mx-0 lg:overflow-hidden lg:rounded-xl lg:border dark:border-neutral-800 dark:bg-neutral-900"
      >
        {query.isPending || (volumePending && !rankingError) ? (
          <>
            <div className="lg:hidden">
              <MobileProjectListSkeleton rows={5} />
            </div>
            <div className="hidden lg:block">
              <ProjectsTableSkeleton
                rows={5}
                directory
                figureLabel={figureLabel}
                dateLabel="Launch date"
              />
            </div>
          </>
        ) : query.isError && !query.data ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Could not load launches</EmptyTitle>
              <EmptyDescription>{query.error.message}</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </Empty>
        ) : rankingError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Could not load recent rankings</EmptyTitle>
              <EmptyDescription>{metrics.error.message}</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => void metrics.refetch()}>
              Retry
            </Button>
          </Empty>
        ) : rows.length ? (
          <>
            <div className="lg:hidden">
              <MobileProjectList rows={rows} showProgress={showMobileProgress} />
            </div>
            <div className="hidden lg:block">
              <ProjectsTable
                directory
                rows={rows}
                figureLabel={figureLabel}
                dateLabel="Launch date"
                sorting={sorting}
                caption={`Indexed projects on page ${currentPage}. ${sortLabels[sort] ?? (sort === 'phase' ? 'Graduation' : projectColumns.find((c) => c.key === sort)?.label)}, ${selectedDirection === 'asc' ? 'ascending' : 'descending'}. ${complete ? 'Filtered and ranked across all projects.' : 'Rankings are limited to this page.'} Participants are indexed buyers; pool balances are curve reserves.`}
              />
            </div>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {launches.length ? 'No matching projects' : 'No launches yet'}
              </EmptyTitle>
              <EmptyDescription>
                {launches.length
                  ? 'Try another name, symbol or category.'
                  : 'Launches will appear here once available.'}
              </EmptyDescription>
            </EmptyHeader>
            {(search || category !== 'All' || sort === 'graduation') && (
              <Link
                href={href(1, 'newest', 'desc', 'All', '')}
                className="rounded text-sm underline underline-offset-4 focus-visible:outline-2"
              >
                Clear filters
              </Link>
            )}
          </Empty>
        )}
      </div>
      {recentRanking && metrics.isError && metrics.data && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-destructive"
        >
          Could not refresh recent rankings. Showing the last fetched metrics.
          <Button
            size="sm"
            variant="outline"
            onClick={() => void metrics.refetch()}
          >
            Retry rankings
          </Button>
        </div>
      )}
      {query.isError && query.data && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs text-destructive"
        >
          Could not refresh projects. Showing the last fetched page.
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {query.data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <p className="hidden tabular-nums lg:block" aria-live="polite">
            {total && (complete ? rows.length : launches.length)
              ? `${(currentPage - 1) * limit + 1}–${Math.min(total, (currentPage - 1) * limit + (complete ? rows.length : launches.length))} of ${total.toLocaleString('en-US')} projects${complete ? '' : ` · ${rows.length} matches on this page`}`
              : `0 shown · ${total} projects`}
          </p>
          <nav
            aria-label="Project pagination"
            className="flex w-full min-w-0 items-center justify-between gap-2 lg:w-auto lg:justify-start"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 lg:size-control-sm pointer-coarse:size-11"
              disabled={currentPage <= 1}
              nativeButton={currentPage <= 1}
              render={
                currentPage > 1 ? (
                  <Link href={href(currentPage - 1)} scroll={false} />
                ) : undefined
              }
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="px-1 tabular-nums" aria-current="page">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 lg:size-control-sm pointer-coarse:size-11"
              disabled={currentPage >= pageCount}
              nativeButton={currentPage >= pageCount}
              render={
                currentPage < pageCount ? (
                  <Link href={href(currentPage + 1)} scroll={false} />
                ) : undefined
              }
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      )}
    </section>
  );
}
