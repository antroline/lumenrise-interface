import Link from 'next/link';
import { ProjectMark, type ProjectMarkName } from '@/components/project-mark';
import { StatusPill, StatusText } from '@/components/status';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LaunchPhase } from '@/lib/data';
import { cn } from '@/lib/utils';

export type DiscoverRow = {
  key: string;
  name: ProjectMarkName;
  title: string;
  href?: string;
  category: 'Launch' | 'Auction' | 'Trading';
  phase: LaunchPhase | 'refunded';
  figure: string;
  participants?: string;
  date: string;
};

export function DiscoverTable({
  rows,
  figureHeading,
  showStage,
  showParticipants,
}: {
  rows: DiscoverRow[];
  figureHeading: string;
  showStage: boolean;
  showParticipants: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table className="table-fixed dark:text-foreground">
      <caption className="sr-only">
        {figureHeading} for {rows.length}{' '}
        {rows.length === 1 ? 'project' : 'projects'}
      </caption>
      <colgroup>
        <col
          className={
            showParticipants
              ? showStage
                ? 'w-[38%] sm:w-[28%]'
                : 'w-[38%] sm:w-[32%]'
              : showStage
                ? 'w-[42%] sm:w-[32%]'
                : 'w-[42%] sm:w-[38%]'
          }
        />
        <col
          className={
            showParticipants
              ? 'w-[17%] sm:w-[16%]'
              : showStage
                ? 'w-[18%] sm:w-[16%]'
                : 'w-[18%] sm:w-[18%]'
          }
        />
        {showStage && (
          <col
            className={
              showParticipants
                ? 'hidden sm:table-column sm:w-[14%]'
                : 'hidden sm:table-column sm:w-[15%]'
            }
          />
        )}
        <col
          className={
            showParticipants
              ? showStage
                ? 'w-[22%] sm:w-[14%]'
                : 'w-[22%] sm:w-[17%]'
              : showStage
                ? 'w-[23%] sm:w-[16%]'
                : 'w-[23%] sm:w-[20%]'
          }
        />
        {showParticipants && (
          <col
            className={showStage ? 'w-[23%] sm:w-[14%]' : 'w-[23%] sm:w-[15%]'}
          />
        )}
        <col
          className={
            showParticipants
              ? showStage
                ? 'hidden sm:table-column sm:w-[14%]'
                : 'hidden sm:table-column sm:w-[20%]'
              : showStage
                ? 'w-[17%] sm:w-[21%]'
                : 'w-[17%] sm:w-[24%]'
          }
        />
      </colgroup>
      <TableHeader className="dark:[&_th]:text-foreground">
        <TableRow className="bg-muted [&>th:first-child]:rounded-l-xl [&>th:last-child]:rounded-r-xl">
          <TableHead className="border-0 py-3 pl-4! text-[11px]! tracking-normal normal-case sm:text-xs!">
            Project
          </TableHead>
          <TableHead className="border-0 px-1 py-3 text-[11px]! tracking-normal normal-case sm:px-3 sm:text-xs!">
            Category
          </TableHead>
          {showStage && (
            <TableHead className="hidden border-0 py-3 text-[11px]! tracking-normal normal-case sm:table-cell sm:text-xs!">
              Stage
            </TableHead>
          )}
          <TableHead className="border-0 px-2 py-3 text-right text-[11px]! tracking-normal normal-case sm:px-3 sm:text-xs!">
            {figureHeading}
          </TableHead>
          {showParticipants && (
            <TableHead className="border-0 px-2 py-3 text-right text-[11px]! tracking-normal normal-case sm:px-3 sm:text-xs!">
              Participants
            </TableHead>
          )}
          <TableHead
            className={cn(
              'border-0 py-3 pr-4! text-right text-[11px]! tracking-normal normal-case sm:text-xs!',
              showParticipants && 'hidden sm:table-cell',
            )}
          >
            Date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.key}
            className={cn(
              'relative transition-colors hover:bg-secondary',
              row.href && 'focus-within:bg-secondary',
            )}
          >
            <TableCell className="max-w-0 border-0 py-2.5 pl-4!">
              {row.href ? (
                <Link
                  href={row.href}
                  className="group flex w-full min-w-0 items-center gap-2 rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-lime sm:gap-3"
                >
                  <ProjectMark
                    name={row.name}
                    size={32}
                    className="size-8 shrink-0"
                  />
                  <span className="truncate text-ui font-semibold text-foreground group-hover:underline sm:text-sm">
                    {row.title}
                  </span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <ProjectMark
                    name={row.name}
                    size={32}
                    className="size-8 shrink-0"
                  />
                  <span className="truncate text-ui font-semibold sm:text-sm">
                    {row.title}
                  </span>
                </span>
              )}
            </TableCell>
            <TableCell className="border-0 px-1 py-2.5 text-ui whitespace-nowrap text-muted-foreground sm:px-3 sm:text-sm dark:text-foreground">
              {row.category}
            </TableCell>
            {showStage && (
              <TableCell className="hidden border-0 py-2.5 sm:table-cell">
                {row.phase === 'refunded' ? (
                  <StatusText
                    tone="warn"
                    className="text-sm dark:text-foreground"
                  >
                    Refunded
                  </StatusText>
                ) : (
                  <StatusPill
                    status={row.phase}
                    className="text-sm dark:text-foreground"
                  />
                )}
              </TableCell>
            )}
            <TableCell className="border-0 px-2 py-2.5 text-right text-ui font-semibold whitespace-nowrap tabular-nums sm:px-3 sm:text-sm">
              {row.figure}
            </TableCell>
            {showParticipants && (
              <TableCell className="border-0 px-2 py-2.5 text-right text-ui whitespace-nowrap tabular-nums sm:px-3 sm:text-sm">
                {row.participants ?? '—'}
              </TableCell>
            )}
            <TableCell
              className={cn(
                'border-0 py-2.5 pr-4! text-right text-ui whitespace-nowrap sm:text-sm',
                showParticipants && 'hidden sm:table-cell',
              )}
            >
              <span className="sm:hidden" aria-hidden="true">
                {row.date.split(' · ')[0]}
              </span>
              <span className="sr-only sm:hidden">{row.date}</span>
              <span className="hidden sm:inline">{row.date}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}
