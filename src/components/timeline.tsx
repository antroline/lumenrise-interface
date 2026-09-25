import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TimelineEntry = {
  key: string
  title: ReactNode
  detail: ReactNode
  state: 'done' | 'current' | 'todo'
  aside?: ReactNode
}

export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {entries.map((entry, index) => (
        <li
          key={entry.key}
          aria-current={entry.state === 'current' ? 'step' : undefined}
          className="relative grid grid-cols-[20px_1fr] gap-3 pb-[18px] last:pb-0"
        >
          {index < entries.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-[18px] -bottom-0.5 left-[9px] w-[1.5px]',
                entry.state === 'done' ? 'bg-emphasis' : 'bg-border',
              )}
            />
          )}
          <span
            className={cn(
              'z-10 grid size-5 place-items-center rounded-full border-[1.5px] bg-background',
              entry.state === 'todo' && 'border-border',
              entry.state === 'done' && 'border-emphasis bg-emphasis text-emphasis-mark',
              entry.state === 'current' && 'border-emphasis shadow-[0_0_0_4px_var(--accent)]',
            )}
          >
            {entry.state === 'done' && <Check className="size-[11px]" aria-label="Done" />}
            {entry.state === 'current' && <span aria-hidden="true" className="size-2 rounded-full bg-emphasis" />}
          </span>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-body leading-[1.3] font-semibold">{entry.title}</div>
              <div className="mt-0.5 font-mono text-meta text-muted-foreground">{entry.detail}</div>
            </div>
            {entry.aside && <span className="shrink-0 text-small text-muted-foreground">{entry.aside}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}
