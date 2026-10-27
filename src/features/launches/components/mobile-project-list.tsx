import Link from 'next/link';
import { Users } from 'lucide-react';
import { TokenLogo } from '@/components/token-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { graduationLabel, type ProjectTableRow } from '@/lib/project-table';

/** Optional presentation experiment; no progress is invented for other launch types. */
function MiniGraduationProgress({ row }: { row: ProjectTableRow }) {
  const graduation = row.graduation;
  if (!graduation || graduation.status === 'Target unavailable') return null;
  return (
    <progress
      aria-label={`${row.name} graduation progress`}
      value={Math.max(0, Math.min(10000, graduation.progressBps))}
      max={10000}
      className="mt-2 block h-0.5 w-full appearance-none overflow-hidden rounded-full bg-secondary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-lime [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-lime"
    />
  );
}

export function MobileProjectList({
  rows,
  showProgress = false,
  figureLabel = 'Total volume',
}: {
  rows: (ProjectTableRow & { href: string })[];
  showProgress?: boolean;
  figureLabel?: string;
}) {
  return (
    <ul aria-label="Projects" className="w-full min-w-0 divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id} className="min-w-0">
          <Link
            href={row.href}
            className="block min-w-0 px-4 py-3 transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground sm:px-5"
          >
            <div className="grid min-w-0 grid-cols-[44px_minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-2.5">
              <TokenLogo logo={row.logo} name={row.name} seed={row.id} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={row.title ?? row.name}>
                  {row.title ?? row.name}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {row.ticker && (
                    <span className="max-w-16 min-w-0 truncate" title={row.ticker}>
                      ${row.ticker}
                    </span>
                  )}
                  {row.ticker && <span aria-hidden="true">·</span>}
                  <span className="flex min-w-0 items-center gap-1 tabular-nums" aria-label={row.participants === null ? 'Participants unavailable' : `${row.participants.toLocaleString('en-US')} ${row.participants === 1 ? 'participant' : 'participants'}`}>
                    <Users className="size-3 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-all">{row.participants?.toLocaleString('en-US') ?? '—'}</span>
                  </span>
                </div>
              </div>
              <div className="min-w-0 text-right tabular-nums">
                <p className="text-sm font-semibold [overflow-wrap:anywhere]" title={row.figureTitle}>
                  <span className="sr-only">{figureLabel}: </span>{row.figure}
                </p>
                {row.graduation && (
                  <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {graduationLabel(row.graduation, row.phase)}
                    {row.graduation.stale && (
                      <span title="Last indexed snapshot · may be out of date"> *<span className="sr-only">Last indexed snapshot · may be out of date</span></span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {showProgress && <MiniGraduationProgress row={row} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MobileProjectListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2.5 px-4 py-3 sm:px-5">
          <Skeleton className="size-11 shrink-0 rounded-xl motion-reduce:animate-none" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-24 max-w-full motion-reduce:animate-none" />
            <Skeleton className="h-3 w-16 max-w-full motion-reduce:animate-none" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-end gap-2">
            <Skeleton className="h-3 w-20 max-w-full motion-reduce:animate-none" />
            <Skeleton className="h-3 w-16 max-w-full motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
