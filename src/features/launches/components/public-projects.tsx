'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StrKey } from '@stellar/stellar-sdk';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  ProjectsTable,
  ProjectsTableSkeleton,
} from '@/components/projects-table';
import { ResultsLink, useResultsPending } from '@/components/results-transition';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LaunchFilters } from './launch-filters';
import {
  MobileProjectList,
  MobileProjectListSkeleton,
} from './mobile-project-list';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { ApiError } from '@/lib/api/client';
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
  type ProjectColumn,
  type SortDirection,
  type ProjectPhase,
  type ProjectTableRow,
} from '@/lib/project-table';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';
import {
  categories,
  activeDirectoryFilterCount,
  launchSortLabels as sortLabels,
  directoryCategory,
  directorySort,
  directorySorts,
  directoryPage,
  directoryHref,
  monetarySort,
  type DirectorySort,
  type DirectoryRequest,
} from '../lib/directory';
import { directoryKey, getDirectory } from '../lib/directory-data';

const phases = {
  Scheduled: 'upcoming',
  Open: 'live',
  Graduated: 'launched',
  Failed: 'failed',
} satisfies Record<string, ProjectPhase>;
const controlClass =
  'inline-flex h-8 min-w-0 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-foreground pointer-coarse:min-h-11';
const activeClass =
  'bg-white text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50';
const inactiveClass =
  'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50';
const statsHelp =
  'Rolling 24-hour statistics cover verified client-submitted trades recorded by the backend; they may not include all on-chain activity.';

function directoryDate(iso: string | null) {
  if (!iso) return { short: '—', full: 'Contract creation date unknown' };
  const date = new Date(iso);
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
  pair: pairParam = '',
  limit = 20,
  showMobileProgress = false,
}: {
  network: ApiNetwork;
  page: number;
  owner?: string;
  category?: string;
  sort?: string;
  direction?: string;
  search?: string;
  pair?: string;
  limit?: number;
  showMobileProgress?: boolean;
}) {
  const visible = usePageVisible();
  const router = useRouter();
  const client = useQueryClient();
  const category = directoryCategory(categoryParam);
  const sort = directorySort(sortParam);
  const selectedDirection: SortDirection = direction === 'asc' ? 'asc' : 'desc';
  const pair = pairParam;
  const request: DirectoryRequest = {
    network,
    page,
    limit,
    owner,
    category,
    sort,
    direction: selectedDirection,
    search,
    pair,
  };
  const queryKey = directoryKey(request);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const navigationPending = useResultsPending();
  const needsPair = monetarySort(sort) && !StrKey.isValidContract(pair);
  const query = useQuery({
    ...publicQueryOptions,
    queryKey,
    queryFn: ({ signal }) => getDirectory(request, signal),
    enabled: visible && !needsPair,
    refetchOnMount: 'always',
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: directoryKey({
          network,
          page,
          limit,
          owner,
          category,
          sort,
          direction: selectedDirection,
          search,
          pair,
        }),
        exact: true,
      });
  }, [
    visible,
    client,
    network,
    page,
    limit,
    owner,
    category,
    sort,
    selectedDirection,
    search,
    pair,
  ]);
  const total = query.data?.total ?? 0;
  const pagination = directoryPage(total, page, limit);
  const currentPage = pagination.page;
  const pageCount = pagination.pageCount;
  const href = (changes: Partial<DirectoryRequest> = {}) =>
    directoryHref(request, changes);
  const activeCount = activeDirectoryFilterCount(request);
  const clearFiltersHref = href({
    category: 'all',
    search: '',
    owner: '',
    limit: 20,
    pair: monetarySort(sort) ? pair : '',
  });
  const canonicalHref = directoryHref(request, { page: currentPage });
  useEffect(() => {
    if (query.data && !query.isFetching && currentPage !== page)
      router.replace(canonicalHref, { scroll: false });
  }, [query.data, query.isFetching, currentPage, page, canonicalHref, router]);
  async function applyFilters(next: DirectoryRequest) {
    setApplyingFilters(true);
    try {
      await client.fetchQuery({
        ...publicQueryOptions,
        queryKey: directoryKey(next),
        queryFn: ({ signal }) => getDirectory(next, signal),
        retry: false,
      });
      router.push(directoryHref(next), { scroll: false });
    } finally {
      setApplyingFilters(false);
    }
  }
  const rows: (ProjectTableRow & { href: string })[] = (
    query.data?.launches ?? []
  ).map((l) => {
    const b = l.bonding,
      label = pairLabel(l.pair, network),
      date = directoryDate(l.createdAt);
    const amount =
      sort === 'topVolume'
        ? l.volume24h.grossPairAmount
        : b?.state.quoteReserve;
    const website = safeExternalUrl(l.metadata.website),
      xUrl = safeExternalUrl(l.metadata.xAccount);
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
      category: 'Bonding Curve',
      phase: b ? phases[b.status] : 'unavailable',
      graduation: b
        ? {
            target:
              BigInt(b.curve.graduationTarget) > BigInt(0)
                ? format(b.curve.graduationTarget) + ' ' + label
                : '—',
            targetTitle: displayAmount(b.curve.graduationTarget) + ' ' + label,
            progressBps: b.progressBps,
            stale: b.stateStale,
            graduated: b.status === 'Graduated' || b.state.graduated,
            status:
              BigInt(b.curve.graduationTarget) === BigInt(0)
                ? 'Target unavailable'
                : b.status,
          }
        : undefined,
      figure: amount === undefined ? '—' : format(amount) + ' ' + label,
      figureTitle:
        amount === undefined
          ? 'Metric unavailable'
          : displayAmount(amount) +
            ' ' +
            label +
            ' · ' +
            (sort === 'topVolume' ? statsHelp : 'indexed curve reserve'),
      figureContext: '',
      participants: b?.state.buyerCount ?? null,
      date: date.short,
      dateTitle: date.full,
      dateLabel: l.createdAt ? 'created · UTC' : undefined,
    };
  });
  const sortColumns: Partial<Record<DirectorySort, ProjectColumn>> = {
    newest: 'date',
    almostGraduated: 'phase',
    topVolume: 'figure',
    name: 'name',
    category: 'category',
    phase: 'phase',
    figure: 'figure',
    participants: 'participants',
  };
  const selectedColumn = sortColumns[sort];
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
      return {
        href: href({
          sort: column === selectedColumn ? sort : directorySort(column),
          direction: next,
        }),
        direction: next,
      };
    },
  };
  const figureLabel = sort === 'topVolume' ? 'Volume · 24h' : 'Pool balance';
  const filtered = !!(
    search ||
    owner ||
    category !== 'all' ||
    pair ||
    sort === 'almostGraduated'
  );
  const busy = applyingFilters || navigationPending ||
    (!needsPair && (query.isPending || query.isFetching));
  const errorTitle =
    query.error instanceof ApiError && query.error.status === 400
      ? 'Invalid launch filters'
      : query.error instanceof ApiError && query.error.status === 503
        ? 'Launch service temporarily unavailable'
        : 'Could not load launches';

  return (
    <section
      className="mb-8 flex min-w-0 flex-col gap-4"
      aria-label="Project directory"
      aria-busy={busy}
    >
      <div className="-mx-2 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:-mx-3 lg:mx-0">
        <div className="flex min-w-0 items-center gap-2">
          <nav
            aria-label="Launch category"
            className="min-w-0 rounded-lg bg-neutral-200/60 p-1 dark:bg-neutral-800"
          >
            <div className="flex gap-1">
              {categories.map((item) => (
                <ResultsLink
                  key={item}
                  href={href({ category: directoryCategory(item) })}
                  scroll={false}
                  aria-current={
                    directoryCategory(item) === category ? 'page' : undefined
                  }
                  className={cn(
                    controlClass,
                    directoryCategory(item) === category
                      ? activeClass
                      : inactiveClass,
                  )}
                >
                  {item}
                </ResultsLink>
              ))}
            </div>
          </nav>
          <LaunchFilters
            request={request}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            onApply={applyFilters}
          />
          {activeCount > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    className="pointer-coarse:size-11"
                    render={<ResultsLink href={clearFiltersHref} scroll={false} />}
                  />
                }
                aria-label="Clear filters"
              >
                <X aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Clear filters</TooltipContent>
            </Tooltip>
          )}
        </div>
        <nav
          aria-label="Project sorting"
          className="w-full min-w-0 max-w-full lg:ml-auto lg:w-auto"
        >
          <div className="grid grid-cols-[auto_auto_auto_auto] items-stretch gap-1 rounded-md bg-neutral-200/60 p-1 lg:flex lg:flex-wrap lg:items-center lg:bg-transparent lg:p-0 dark:bg-neutral-800 lg:dark:bg-transparent">
            <span className="mr-1 hidden shrink-0 text-xs whitespace-nowrap text-muted-foreground lg:inline">
              Sort by:
            </span>
            {directorySorts.map((item) => (
              <ResultsLink
                key={item}
                href={href({ sort: item, direction: 'desc' })}
                scroll={false}
                title={
                  item === 'trending' || item === 'topVolume'
                    ? statsHelp
                    : item === 'newest'
                      ? 'Verified contract-creation time'
                      : 'Open, ungraduated curves ranked by reserve / target'
                }
                aria-current={sort === item ? 'page' : undefined}
                className={cn(
                  controlClass,
                  'h-auto min-h-11 px-1 py-1 text-center text-[11px] whitespace-nowrap min-[390px]:text-xs lg:h-8 lg:min-h-0 lg:px-2 lg:py-0',
                  sort === item ? activeClass : inactiveClass,
                )}
              >
                {sortLabels[item]}
              </ResultsLink>
            ))}
          </div>
        </nav>
      </div>
      <div className="@container -mx-4 min-w-0 border-y border-neutral-200 bg-white sm:-mx-5 lg:mx-0 lg:overflow-hidden lg:rounded-xl lg:border dark:border-neutral-800 dark:bg-neutral-900">
        {needsPair ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Select a payment asset</EmptyTitle>
              <EmptyDescription>
                Choose the payment asset in Filters to rank volume or pool
                balances within one asset.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => setFiltersOpen(true)}>
              Choose payment asset
            </Button>
          </Empty>
        ) : busy ? (
          <>
            <div className="lg:hidden">
              <MobileProjectListSkeleton rows={5} />
            </div>
            <div className="hidden lg:block">
              <ProjectsTableSkeleton
                rows={5}
                directory
                figureLabel={figureLabel}
                dateLabel="Created"
              />
            </div>
          </>
        ) : query.isError && !query.data ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{errorTitle}</EmptyTitle>
              <EmptyDescription>{query.error.message}</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </Empty>
        ) : rows.length ? (
          <>
            <div className="lg:hidden">
              <MobileProjectList
                rows={rows}
                showProgress={showMobileProgress}
                figureLabel={figureLabel}
              />
            </div>
            <div className="hidden lg:block">
              <ProjectsTable
                directory
                rows={rows}
                figureLabel={figureLabel}
                dateLabel="Created"
                sorting={sorting}
                caption={`Projects on page ${currentPage}, filtered and ordered by the backend. ${sortLabels[sort]}, ${selectedDirection}. ${statsHelp}`}
              />
            </div>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {filtered ? 'No matching projects' : 'No launches yet'}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? 'Try another name, symbol or filter.'
                  : 'Launches will appear here once available.'}
              </EmptyDescription>
            </EmptyHeader>
            {activeCount > 0 && (
              <Link
                href={clearFiltersHref}
                className="rounded text-sm underline underline-offset-4 focus-visible:outline-2"
              >
                Clear filters
              </Link>
            )}
          </Empty>
        )}
      </div>
      {query.isError && query.data && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-xs text-destructive"
        >
          {errorTitle}. Showing the last fetched page.
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {query.data && !needsPair && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="hidden tabular-nums lg:block" aria-live="polite">
            {rows.length
              ? `${(page - 1) * limit + 1}–${Math.min(total, (page - 1) * limit + rows.length)} of ${total.toLocaleString('en-US')} projects`
              : `0 shown · ${total} projects`}
          </p>
          {total > 0 && (
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
                    <ResultsLink
                      href={href({ page: currentPage - 1 })}
                      scroll={false}
                    />
                  ) : undefined
                }
                aria-label="Previous page"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="px-1 tabular-nums" aria-current="page">
                Page {total ? currentPage : 0} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-11 lg:size-control-sm pointer-coarse:size-11"
                disabled={currentPage >= pageCount}
                nativeButton={currentPage >= pageCount}
                render={
                  currentPage < pageCount ? (
                    <ResultsLink
                      href={href({ page: currentPage + 1 })}
                      scroll={false}
                    />
                  ) : undefined
                }
                aria-label="Next page"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
