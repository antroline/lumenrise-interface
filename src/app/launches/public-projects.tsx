'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ProjectsTable,
  ProjectsTableSkeleton,
} from '@/components/projects-table';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { getLaunchList } from '@/lib/api/launches/market';
import { displayAmount, pairLabel, unixDate } from '@/lib/api/launches/display';
import { publicQueryOptions, usePageVisible } from '@/lib/api/launches/queries';
import type { ApiNetwork } from '@/lib/api/launches/types';
import {
  projectColumns,
  type ProjectColumn,
  type SortDirection,
  type ProjectPhase,
  type ProjectTableRow,
} from '@/lib/project-table';

const phases = {
  Scheduled: 'upcoming',
  Open: 'live',
  Graduated: 'launched',
  Failed: 'failed',
} satisfies Record<string, ProjectPhase>;

export function PublicProjects({
  network,
  page,
  owner,
  category,
  sort,
  direction,
}: {
  network: ApiNetwork;
  page: number;
  owner?: string;
  category?: string;
  sort?: string;
  direction?: string;
}) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const queryKey = ['launch-list', network, owner ?? '', page];
  const query = useQuery({
    ...publicQueryOptions,
    queryKey,
    queryFn: ({ signal }) => getLaunchList(network, page, 20, owner, signal),
    enabled: visible,
  });
  useEffect(() => {
    if (!visible)
      void client.cancelQueries({
        queryKey: ['launch-list', network, owner ?? '', page],
      });
  }, [visible, client, network, owner, page]);
  const rows: ProjectTableRow[] = [
    ...new Map(
      (query.data?.launches ?? []).map((l) => [
        `${l.network}:${l.contractId}`,
        l,
      ]),
    ).values(),
  ].map((l) => {
    const b = l.bonding,
      pair = pairLabel(l.pair, network);
    return {
      id: `${network}:${l.contractId}`,
      name: l.metadata.name,
      ticker: l.metadata.symbol,
      logo: l.metadata.logo,
      href: `/launch/${l.contractId}?network=${network}`,
      category: b?.status === 'Graduated' ? 'Trading' : 'Launch',
      model: b ? 'Bonding curve' : '—',
      phase: b ? phases[b.status] : 'unavailable',
      statusLabel: b?.status,
      figure: b ? `${displayAmount(b.state.quoteReserve)} ${pair}` : '—',
      figureContext: 'curve reserve',
      participants: b?.state.buyerCount ?? null,
      date: unixDate(b?.status === 'Scheduled' ? b.startsAt : b?.endsAt),
      dateLabel: b?.status === 'Scheduled' ? 'opens' : b ? 'ends' : undefined,
      snapshot: b ? `${b.progressBps / 100}%` : '—',
      snapshotContext: b?.stateStale
        ? 'Snapshot may be outdated'
        : b
          ? 'of target'
          : undefined,
    };
  });
  const filtered = rows.filter(
    (row) =>
      !category ||
      category.toLowerCase() === 'all' ||
      row.category.toLowerCase() === category.toLowerCase(),
  );
  if (sort) {
    const byId = new Map(
      (query.data?.launches ?? []).map((launch) => [
        network + ':' + launch.contractId,
        launch,
      ]),
    );
    function value(row: ProjectTableRow): string | bigint | null {
      const bonding = byId.get(row.id)?.bonding;
      switch (sort) {
        case 'name':
          return row.name;
        case 'category':
          return row.category;
        case 'phase':
          return row.phase;
        case 'participants':
          return bonding ? BigInt(bonding.state.buyerCount) : null;
        case 'date':
          return bonding
            ? BigInt(
                bonding.status === 'Scheduled'
                  ? bonding.startsAt
                  : bonding.endsAt,
              )
            : null;
        case 'figure':
          return bonding ? BigInt(bonding.state.quoteReserve) : null;
        default:
          return null;
      }
    }
    filtered.sort((a, b) => {
      const left = value(a),
        right = value(b);
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      const comparison =
        typeof left === 'bigint' && typeof right === 'bigint'
          ? left === right
            ? 0
            : left < right
              ? -1
              : 1
          : String(left).localeCompare(String(right), 'en', { numeric: true });
      return comparison * (direction === 'desc' ? -1 : 1);
    });
  }
  function href(nextPage: number, nextSort = sort, nextDirection = direction) {
    const q = new URLSearchParams({ network, livePage: String(nextPage) });
    if (owner) q.set('owner', owner);
    if (category) q.set('category', category);
    if (nextSort) q.set('sort', nextSort);
    if (nextDirection) q.set('dir', nextDirection);
    return `/launches?${q}`;
  }
  const total = query.data?.total ?? 0,
    currentPage = query.data?.page ?? page,
    limit = query.data?.limit ?? 20;
  const selectedSort =
    projectColumns.find((c) => c.key === sort)?.key ?? 'name';
  const selectedDirection: SortDirection =
    direction === 'desc' ? 'desc' : 'asc';
  const sorting = {
    column: selectedSort,
    direction: selectedDirection,
    explicit: !!sort,
    link: (column: ProjectColumn) => {
      const next: SortDirection =
        column === sort
          ? selectedDirection === 'asc'
            ? 'desc'
            : 'asc'
          : column === 'participants' ||
              column === 'figure' ||
              column === 'date'
            ? 'desc'
            : 'asc';
      return { href: href(currentPage, column, next), direction: next };
    },
  };
  return (
    <section className="mb-8 flex flex-col gap-4" aria-label="Launched tokens">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold">
          Launched tokens · {network === 'public' ? 'Mainnet' : 'Testnet'}
        </h2>
        <span className="text-small text-muted-foreground">
          Filters and sorting apply to this page
        </span>
      </div>
      {query.isPending ? (
        <ProjectsTableSkeleton rows={5} directory />
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
      ) : filtered.length ? (
        <ProjectsTable
          directory
          rows={filtered}
          sorting={sorting}
          caption="Indexed launches on the selected network"
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {rows.length
                ? 'No matches on this page'
                : total
                  ? 'No launches on this page'
                  : 'No launches yet'}
            </EmptyTitle>
            <EmptyDescription>
              {rows.length || total
                ? 'Choose another category or browse the next page.'
                : 'Launches will appear here once available.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {query.isError && query.data && (
        <p role="alert" className="text-small text-destructive">
          Could not refresh launches.{' '}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </p>
      )}
      {query.data && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="caps tabular-nums">
            {rows.length
              ? `Showing ${(currentPage - 1) * limit + 1}–${(currentPage - 1) * limit + rows.length} of ${total}`
              : total
                ? `0 launches on this page · ${total} total`
                : '0 launches'}
          </p>
          <nav
            aria-label="Launch pagination"
            className="flex items-center gap-3 text-ui"
          >
            {currentPage > 1 && (
              <Link
                href={href(currentPage - 1)}
                aria-label="Previous launches page"
                className="rounded-md p-2 focus-visible:outline-2"
              >
                <ChevronLeft className="size-4" />
              </Link>
            )}
            <span>Page {currentPage}</span>
            {currentPage * limit < total && (
              <Link
                href={href(currentPage + 1)}
                aria-label="Next launches page"
                className="rounded-md p-2 focus-visible:outline-2"
              >
                <ChevronRight className="size-4" />
              </Link>
            )}
          </nav>
        </div>
      )}
    </section>
  );
}
