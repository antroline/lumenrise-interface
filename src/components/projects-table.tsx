import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { XLogoIcon } from '@/components/brand-icons';
import { TokenLogo } from '@/components/token-logo';
import { ResultsLink } from '@/components/results-transition';
import { StatusDot } from '@/components/status';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  projectColumns,
  graduationLabel,
  type ProjectColumn,
  type ProjectPhase,
  type ProjectTableRow,
  type SortDirection,
} from '@/lib/project-table';
import { cn } from '@/lib/utils';

type ProjectTableSorting = {
  column: ProjectColumn | undefined;
  direction: SortDirection;
  /** Hide the direction indicator while the list uses its default order. */
  explicit: boolean;
  link: (column: ProjectColumn) => { href: string; direction: SortDirection } | undefined;
};

const phaseStatus: Record<
  ProjectPhase,
  { label: string; tone: ComponentProps<typeof StatusDot>['tone'] }
> = {
  live: { label: 'Live', tone: 'lime' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  auction: { label: 'Auction', tone: 'warn' },
  launched: { label: 'Launched', tone: 'ok' },
  settling: { label: 'Settling', tone: 'warn' },
  completed: { label: 'Completed', tone: 'gray' },
  refunded: { label: 'Refunded', tone: 'warn' },
  unavailable: { label: 'Unavailable', tone: 'gray' },
  failed: { label: 'Failed', tone: 'warn' },
};

const tableClass = 'min-w-[880px] table-fixed text-sm';
const headClass =
  'border-0 bg-secondary py-3 align-middle first:rounded-l-lg first:pl-4 last:rounded-r-lg last:pr-4 dark:bg-muted';
const cellClass = 'py-2.5 first:pl-4 last:pr-4';
const nameClass = 'flex min-w-0 items-center gap-3';
const directoryTableClass =
  'min-w-[1200px] table-fixed bg-white text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50';
const directoryHeadClass =
  'h-12 border-0 bg-neutral-100 px-3 py-0 align-middle font-sans! text-xs! font-medium! tracking-normal! whitespace-nowrap text-neutral-600 first:pl-4 last:pr-4 dark:bg-neutral-800 dark:text-neutral-400';
const directoryCellClass =
  'border-neutral-100 bg-white px-3 py-3 whitespace-nowrap first:pl-4 last:pr-4 dark:border-neutral-800 dark:bg-neutral-900';
const directoryColumns = projectColumns.map((column) => ({
  ...column,
  label: column.key === 'phase' ? 'Graduation' : column.label,
}));

function ProjectColumns({ directory = false }: { directory?: boolean }) {
  return (
    <colgroup>
      {directory ? (
        <>
          <col className="w-[26%]" />
          <col className="w-[13%]" />
          <col className="w-[21%]" />
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[15%]" />
        </>
      ) : (
        <>
          <col className="w-[27%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[19%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
        </>
      )}
    </colgroup>
  );
}

function ProjectName({
  row,
  directory = false,
}: {
  row: ProjectTableRow;
  directory?: boolean;
}) {
  return (
    <>
      <TokenLogo logo={row.logo} name={row.name} seed={row.id} size={36} />
      {directory ? (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="block truncate font-medium"
            title={row.title ?? row.name}
          >
            {row.title ?? row.name}
          </span>
          {row.ticker && (
            <span
              className="block max-w-20 shrink-0 truncate text-xs text-neutral-500 dark:text-neutral-400"
              title={row.ticker}
            >
              {row.ticker}
            </span>
          )}
        </span>
      ) : (
        <>
          <span className="truncate font-medium">
            {row.title ?? row.name}
          </span>
          {row.ticker && (
            <span className="shrink-0 text-small text-muted-foreground">
              {row.ticker}
            </span>
          )}
        </>
      )}
    </>
  );
}

function Graduation({
  graduation,
  phase,
}: {
  graduation: ProjectTableRow['graduation'];
  phase: ProjectPhase;
}) {
  if (!graduation) return <span className="text-muted-foreground">—</span>;
  const graduated = graduation.graduated ?? phase === 'launched';
  const label = graduationLabel(graduation, phase);
  return (
    <div
      className="flex min-w-0 items-center gap-2 whitespace-nowrap tabular-nums"
      title={
        graduation.stale
          ? 'Last indexed snapshot · may be out of date'
          : undefined
      }
    >
      <span className="min-w-0 truncate font-medium" title={graduation.targetTitle ?? graduation.target}>
        {graduation.target}
      </span>
      <Badge
        size="sm"
        variant="soft"
        className={cn(
          'rounded-md',
          graduated &&
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        )}
      >
        {label}
      </Badge>
      {graduation.stale && (
        <span
          className="text-xs text-neutral-500"
          title="Last indexed snapshot · may be out of date"
        >
          *
        </span>
      )}
    </div>
  );
}

export function ProjectsTable({
  rows,
  caption,
  sorting,
  directory = false,
  figureLabel = 'Key figure',
  dateLabel = 'Date',
}: {
  rows: ProjectTableRow[];
  caption: string;
  sorting?: ProjectTableSorting;
  directory?: boolean;
  figureLabel?: string;
  dateLabel?: string;
}) {
  return (
    <Table className={directory ? directoryTableClass : tableClass}>
      <caption className="sr-only">{caption}</caption>
      <ProjectColumns directory={directory} />
      <TableHeader>
        <TableRow>
          {(directory ? directoryColumns : projectColumns).map((column) => {
            const label =
              column.key === 'figure'
                ? figureLabel
                : column.key === 'date'
                  ? dateLabel
                  : column.label;
            const active = sorting?.column === column.key;
            const link = sorting?.link(column.key);
            return (
              <TableHead
                key={column.key}
                scope="col"
                aria-sort={
                  sorting
                    ? active
                      ? sorting.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
                className={cn(
                  directory ? directoryHeadClass : headClass,
                  column.key === 'name' && 'sticky left-0 z-10',
                  directory &&
                    ['figure', 'participants', 'date'].includes(column.key) &&
                    'text-right',
                )}
              >
                {link ? (
                  <ResultsLink
                    href={link.href}
                    scroll={false}
                    aria-label={`Sort by ${label}, ${link.direction === 'asc' ? 'ascending' : 'descending'}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
                      active && sorting?.explicit && 'text-foreground',
                      directory && 'max-w-full whitespace-nowrap focus-visible:outline-foreground pointer-coarse:min-h-11 [&>svg]:shrink-0',
                    )}
                  >
                    {label}
                    {active &&
                      sorting?.explicit &&
                      (sorting.direction === 'asc' ? (
                        <ChevronUp aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="size-3.5" />
                      ))}
                    {!active && (
                      <ArrowUpDown
                        aria-hidden="true"
                        className="size-3 opacity-50"
                      />
                    )}
                  </ResultsLink>
                ) : (
                  label
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = phaseStatus[row.phase];
          return (
            <TableRow
              key={row.id}
              className={cn(
                'relative [&>td]:transition-colors',
                directory
                  ? 'focus-within:[&>td]:bg-neutral-50 hover:[&>td]:bg-neutral-50 dark:focus-within:[&>td]:bg-neutral-800 dark:hover:[&>td]:bg-neutral-800'
                  : 'focus-within:[&>td]:bg-muted hover:[&>td]:bg-muted',
              )}
            >
              <TableCell
                className={cn(
                  directory ? directoryCellClass : cellClass,
                  'sticky left-0 z-10',
                  !directory && 'bg-page',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {row.href ? (
                    <Link
                      href={row.href}
                      className={cn(
                        nameClass,
                        directory && 'flex-1',
                        "rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring",
                        directory && 'focus-visible:after:ring-foreground',
                      )}
                    >
                      <ProjectName row={row} directory={directory} />
                    </Link>
                  ) : (
                    <span className={nameClass}>
                      <ProjectName row={row} directory={directory} />
                    </span>
                  )}
                  {directory && (row.website || row.xAccount) && (
                    <div className="relative z-20 ml-auto flex shrink-0 items-center gap-0.5">
                      {[
                        { href: row.website, label: 'Website', Icon: Globe },
                        {
                          href: row.xAccount,
                          label: 'X / Twitter',
                          Icon: XLogoIcon,
                        },
                      ].map(
                        ({ href, label, Icon }) =>
                          href && (
                            <a
                              key={label}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={
                                row.name + ': ' + label + ' (opens in new tab)'
                              }
                              title={label}
                              className="inline-flex size-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-foreground pointer-coarse:size-11 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                            >
                              <Icon className="size-3" aria-hidden="true" />
                            </a>
                          ),
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                {directory ? (
                  <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                    <span className="min-w-0 truncate" title={row.category}>{row.category}</span>
                    {row.model && (
                      <span
                        className="truncate text-small text-muted-foreground"
                        title={row.model}
                      >
                        · {row.model}
                      </span>
                    )}
                  </div>
                ) : (
                  row.category
                )}
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                {directory ? (
                  <Graduation graduation={row.graduation} phase={row.phase} />
                ) : (
                  <span
                    className={cn(
                      'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-small font-medium whitespace-nowrap',
                      row.phase === 'live'
                        ? 'bg-foreground text-background dark:bg-secondary dark:text-foreground'
                        : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    <StatusDot tone={status.tone} />
                    {row.statusLabel ?? status.label}
                  </span>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  directory ? directoryCellClass : cellClass,
                  'tabular-nums',
                  directory && 'text-right',
                  'whitespace-nowrap',
                )}
              >
                <span
                  title={row.figureTitle}
                  className="whitespace-nowrap"
                >
                  {row.figure}
                </span>{' '}
                <span className="text-small text-muted-foreground">
                  {row.figureContext}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  directory ? directoryCellClass : cellClass,
                  'tabular-nums',
                  directory && 'text-right',
                )}
              >
                {row.participants === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  row.participants.toLocaleString('en-US')
                )}
              </TableCell>
              <TableCell
                className={cn(
                  directory ? directoryCellClass : cellClass,
                  'tabular-nums',
                  directory && 'text-right',
                  'whitespace-nowrap',
                )}
              >
                <span title={row.dateTitle}>{row.date}</span>
                {row.dateLabel && (
                  <span className="text-small text-muted-foreground">
                    {' '}
                    {row.dateLabel}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

const skeletonWidths = [
  ['w-20', 'w-14', 'w-24', 'w-10', 'w-20'],
  ['w-24', 'w-12', 'w-20', 'w-12', 'w-24'],
  ['w-16', 'w-16', 'w-28', 'w-8', 'w-16'],
  ['w-28', 'w-12', 'w-24', 'w-10', 'w-20'],
] as const;

function SkeletonBar({ className }: { className: string }) {
  return (
    <Skeleton
      className={cn('bg-secondary motion-reduce:animate-none', className)}
    />
  );
}

/** Mirrors `ProjectsTable` geometry so the two can cross-fade without shifting. */
export function ProjectsTableSkeleton({
  rows,
  directory = false,
  figureLabel = 'Key figure',
  dateLabel = 'Date',
}: {
  rows: number;
  directory?: boolean;
  figureLabel?: string;
  dateLabel?: string;
}) {
  return (
    <Table
      className={directory ? directoryTableClass : tableClass}
      aria-hidden="true"
    >
      <ProjectColumns directory={directory} />
      <TableHeader>
        <TableRow>
          {(directory ? directoryColumns : projectColumns).map((column) => (
            <TableHead
              key={column.key}
              className={directory ? directoryHeadClass : headClass}
            >
              {column.key === 'figure'
                ? figureLabel
                : column.key === 'date'
                  ? dateLabel
                  : column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => {
          const [name, category, figure, participants, date] =
            skeletonWidths[row % skeletonWidths.length];
          return (
            <TableRow key={row}>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                <div className="flex min-w-0 items-center gap-3">
                  <SkeletonBar
                    className={cn(
                      'shrink-0 rounded-lg',
                      directory ? 'size-9' : 'size-9',
                    )}
                  />
                  <SkeletonBar className={cn('h-3', name, directory && 'min-w-0 shrink')} />
                  {!directory && <SkeletonBar className="h-2.5 w-9" />}
                </div>
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                  <SkeletonBar className={cn('h-3', category, directory && 'max-w-full')} />
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                <div className="flex items-center gap-2">
                  {directory && <SkeletonBar className="h-3 w-20" />}
                  <SkeletonBar className="h-6 w-18" />
                </div>
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                  <SkeletonBar className={cn('h-3', figure, directory && 'max-w-full')} />
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                  <SkeletonBar className={cn('h-3', participants, directory && 'max-w-full')} />
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                  <SkeletonBar className={cn('h-3', date, directory && 'max-w-full')} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
