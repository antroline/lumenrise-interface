import type { ComponentProps } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ProjectMark } from '@/components/project-mark'
import { ResultsLink } from '@/components/results-transition'
import { StatusDot } from '@/components/status'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  projectColumns,
  type ProjectColumn,
  type ProjectPhase,
  type ProjectTableRow,
  type SortDirection,
} from '@/lib/project-table'
import { cn } from '@/lib/utils'

type ProjectTableSorting = {
  column: ProjectColumn
  direction: SortDirection
  /** Hide the direction indicator while the list uses its default order. */
  explicit: boolean
  link: (column: ProjectColumn) => { href: string; direction: SortDirection }
}

const phaseStatus: Record<ProjectPhase, { label: string; tone: ComponentProps<typeof StatusDot>['tone'] }> = {
  live: { label: 'Live', tone: 'lime' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  auction: { label: 'Auction', tone: 'warn' },
  launched: { label: 'Launched', tone: 'ok' },
  settling: { label: 'Settling', tone: 'warn' },
  completed: { label: 'Completed', tone: 'gray' },
  refunded: { label: 'Refunded', tone: 'warn' },
}

const tableClass = 'min-w-[880px] table-fixed text-sm'
const headClass = 'border-0 bg-muted py-3 align-middle first:rounded-l-lg first:pl-4 last:rounded-r-lg last:pr-4'
const cellClass = 'py-2.5 first:pl-4 last:pr-4'
const nameClass = 'flex min-w-0 items-center gap-3'
const directoryTableClass = 'min-w-[1120px] table-fixed bg-muted text-[15px]'
const directoryHeadClass = 'border-0 bg-secondary py-4 align-middle font-sans! text-sm! font-bold! tracking-normal! text-muted-foreground first:pl-4 last:pr-4'
const directoryCellClass = 'bg-muted py-3.5 whitespace-nowrap first:pl-4 last:pr-4'
const directoryColumns: { key: ProjectColumn | 'snapshot'; label: string }[] = [
  ...projectColumns.slice(0, 4),
  { key: 'snapshot', label: 'Snapshot' },
  ...projectColumns.slice(4),
]

function ProjectColumns({ directory = false }: { directory?: boolean }) {
  return (
    <colgroup>
      {directory ? <>
        <col className="w-[190px] xl:w-[22%]" />
        <col className="w-[205px] xl:w-[19%]" />
        <col className="w-[110px] xl:w-[10%]" />
        <col className="w-[150px] xl:w-[14%]" />
        <col className="w-[185px] xl:w-[14%]" />
        <col className="w-[125px] xl:w-[9%]" />
        <col className="w-[155px] xl:w-[12%]" />
      </> : <>
        <col className="w-[27%]" />
        <col className="w-[12%]" />
        <col className="w-[14%]" />
        <col className="w-[19%]" />
        <col className="w-[12%]" />
        <col className="w-[16%]" />
      </>}
    </colgroup>
  )
}

function ProjectName({ row, directory = false }: { row: ProjectTableRow; directory?: boolean }) {
  return (
    <>
      <ProjectMark name={row.name} size={directory ? 42 : 36} />
      <span className={cn('truncate font-medium', directory && 'text-base')}>{row.title ?? row.name}</span>
      {row.ticker && <span className="shrink-0 text-small text-muted-foreground">{row.ticker}</span>}
    </>
  )
}

export function ProjectsTable({
  rows,
  caption,
  sorting,
  directory = false,
}: {
  rows: ProjectTableRow[]
  caption: string
  sorting?: ProjectTableSorting
  directory?: boolean
}) {
  return (
    <Table className={directory ? directoryTableClass : tableClass}>
      <caption className="sr-only">{caption}</caption>
      <ProjectColumns directory={directory} />
      <TableHeader>
        <TableRow>
          {(directory ? directoryColumns : projectColumns).map((column) => {
            const sortable = column.key !== 'snapshot'
            const active = sorting?.column === column.key
            const link = column.key === 'snapshot' ? undefined : sorting?.link(column.key)
            return (
              <TableHead
                key={column.key}
                scope="col"
                aria-sort={sortable && sorting ? active ? sorting.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}
                className={cn(directory ? directoryHeadClass : headClass, column.key === 'name' && 'sticky left-0 z-10')}
              >
                {link ? (
                  <ResultsLink
                    href={link.href}
                    scroll={false}
                    aria-label={`Sort by ${column.label}, ${link.direction === 'asc' ? 'ascending' : 'descending'}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-lime',
                      active && sorting?.explicit && 'text-foreground',
                    )}
                  >
                    {column.label}
                    {active && sorting?.explicit && (sorting.direction === 'asc'
                      ? <ChevronUp aria-hidden="true" className="size-3.5" />
                      : <ChevronDown aria-hidden="true" className="size-3.5" />)}
                  </ResultsLink>
                ) : column.label}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = phaseStatus[row.phase]
          return (
            <TableRow
              key={row.id}
              className={cn(
                'relative [&>td]:transition-colors',
                directory
                  ? 'focus-within:[&>td]:bg-secondary hover:[&>td]:bg-secondary'
                  : 'focus-within:[&>td]:bg-muted hover:[&>td]:bg-muted',
              )}
            >
              <TableCell className={cn(directory ? directoryCellClass : cellClass, 'sticky left-0 z-10', !directory && 'bg-background')}>
                {row.href ? (
                  <Link href={row.href} className={cn(nameClass, "rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-lime")}>
                    <ProjectName row={row} directory={directory} />
                  </Link>
                ) : (
                  <span className={nameClass}>
                    <ProjectName row={row} directory={directory} />
                  </span>
                )}
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                {directory ? (
                  <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                    <span className="shrink-0">{row.category}</span>
                    {row.model && <span className="truncate text-small text-muted-foreground" title={row.model}>· {row.model}</span>}
                  </div>
                ) : row.category}
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                <span
                  className={cn(
                    'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-small font-medium whitespace-nowrap',
                    row.phase === 'live'
                      ? 'bg-foreground text-background dark:bg-secondary dark:text-foreground'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  <StatusDot tone={status.tone} />
                  {status.label}
                </span>
              </TableCell>
              <TableCell className={cn(directory ? directoryCellClass : cellClass, 'tabular-nums', !directory && 'whitespace-nowrap')}>
                <span className="whitespace-nowrap">{row.figure}</span>{' '}
                <span className="text-small text-muted-foreground">{row.figureContext}</span>
              </TableCell>
              {directory && <TableCell className={cn(directoryCellClass, 'tabular-nums')}>
                <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <span className={cn('shrink-0 font-medium', row.snapshotDirection === 'up' && 'text-ok', row.snapshotDirection === 'down' && 'text-bad')}>{row.snapshot ?? '—'}</span>
                  {row.snapshotContext && <span className="truncate text-small text-muted-foreground" title={row.snapshotContext}>{row.snapshotContext}</span>}
                </div>
              </TableCell>}
              <TableCell className={cn(directory ? directoryCellClass : cellClass, 'tabular-nums')}>
                {row.participants === null
                  ? <span className="text-muted-foreground">—</span>
                  : row.participants.toLocaleString('en-US')}
              </TableCell>
              <TableCell className={cn(directory ? directoryCellClass : cellClass, 'tabular-nums', !directory && 'whitespace-nowrap')}>
                {row.date}
                {row.dateLabel && <span className="text-small text-muted-foreground"> {row.dateLabel}</span>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

const skeletonWidths = [
  ['w-20', 'w-14', 'w-24', 'w-10', 'w-20'],
  ['w-24', 'w-12', 'w-20', 'w-12', 'w-24'],
  ['w-16', 'w-16', 'w-28', 'w-8', 'w-16'],
  ['w-28', 'w-12', 'w-24', 'w-10', 'w-20'],
] as const

function SkeletonBar({ className }: { className: string }) {
  return <Skeleton className={cn('bg-secondary motion-reduce:animate-none', className)} />
}

/** Mirrors `ProjectsTable` geometry so the two can cross-fade without shifting. */
export function ProjectsTableSkeleton({ rows, directory = false }: { rows: number; directory?: boolean }) {
  return (
    <Table className={directory ? directoryTableClass : tableClass} aria-hidden="true">
      <ProjectColumns directory={directory} />
      <TableHeader>
        <TableRow>
          {(directory ? directoryColumns : projectColumns).map((column) => (
            <TableHead key={column.key} className={directory ? directoryHeadClass : headClass}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => {
          const [name, category, figure, participants, date] = skeletonWidths[row % skeletonWidths.length]
          return (
            <TableRow key={row}>
              <TableCell className={directory ? directoryCellClass : cellClass}>
                <div className="flex items-center gap-3">
                  <SkeletonBar className={cn('shrink-0 rounded-lg', directory ? 'size-[42px]' : 'size-9')} />
                  <SkeletonBar className={cn('h-3', name)} />
                  <SkeletonBar className="h-2.5 w-9" />
                </div>
              </TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}><SkeletonBar className={cn('h-3', category)} /></TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}><SkeletonBar className="h-6 w-18" /></TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}><SkeletonBar className={cn('h-3', figure)} /></TableCell>
              {directory && <TableCell className={directoryCellClass}><SkeletonBar className="h-3 w-16" /></TableCell>}
              <TableCell className={directory ? directoryCellClass : cellClass}><SkeletonBar className={cn('h-3', participants)} /></TableCell>
              <TableCell className={directory ? directoryCellClass : cellClass}><SkeletonBar className={cn('h-3', date)} /></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
