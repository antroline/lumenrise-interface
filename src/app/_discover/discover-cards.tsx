import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ProjectMark } from '@/components/project-mark'
import { StatusDot } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { cardVariants } from '@/components/ui/card'
import type { ProjectTableRow } from '@/lib/project-table'
import { cn } from '@/lib/utils'
import styles from './discover.module.css'

export type DiscoverProject = ProjectTableRow & { requirement?: string }

const gridClass = 'grid gap-4 md:grid-cols-3'

export function DiscoverCards({ rows }: { rows: DiscoverProject[] }) {
  return (
    <ul className={gridClass}>
      {rows.map((row) => (
        <li key={row.id} className={cn(cardVariants(), styles.card, 'relative min-w-0 gap-3.5 p-4 sm:p-5 hover:border-foreground/30 focus-within:border-foreground/30')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProjectMark name={row.name} size={36} />
              <div className="min-w-0">
                <h2 className="text-title font-semibold wrap-anywhere">
                  {row.href ? (
                    <Link href={row.href} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime after:absolute after:inset-0 after:rounded-2xl">
                      {row.title ?? row.name}
                    </Link>
                  ) : row.title ?? row.name}
                </h2>
                {row.ticker && <p className="mt-0.5 text-small text-muted-foreground">{row.ticker}</p>}
              </div>
            </div>
            <Badge variant={row.phase === 'live' ? 'live' : 'soft'} size="sm" className="capitalize">
              <StatusDot tone={row.phase === 'live' ? 'lime' : row.phase === 'upcoming' ? 'info' : 'gray'} />
              {row.phase === 'launched' ? 'Trading' : row.phase}
            </Badge>
          </div>

          <p className="text-small text-muted-foreground">{row.model ?? row.category}</p>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-divider pt-3">
            <div className="col-span-2">
              <dt className="text-small text-muted-foreground capitalize">{row.figureContext}</dt>
              <dd className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.025em] tabular-nums wrap-anywhere">{row.figure}</dd>
            </div>
            {row.participants !== null && (
              <div className="text-small">
                <dt className="text-muted-foreground">Participants</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{row.participants.toLocaleString('en-US')}</dd>
              </div>
            )}
            <div className="text-small">
              <dt className="text-muted-foreground capitalize">{row.dateLabel ?? 'Date'}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{row.date}</dd>
            </div>
          </dl>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-3 text-small">
            <p className="min-w-0 text-muted-foreground">
              {row.requirement ? <><span className="font-medium text-foreground">Entry: </span>{row.requirement === 'None' ? 'Open participation' : row.requirement}</> : row.category === 'Trading' ? 'View market' : 'View launch terms'}
            </p>
            {row.href && <ArrowUpRight aria-hidden="true" className={cn('size-4 shrink-0', styles.cardArrow)} />}
          </div>
        </li>
      ))}
    </ul>
  )
}

