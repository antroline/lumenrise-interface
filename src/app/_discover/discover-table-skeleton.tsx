import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function DiscoverTableSkeleton({ columns }: { columns: 4 | 5 | 6 }) {
  const grid = cn(
    'grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3',
    columns === 4 && 'sm:grid-cols-[2fr_1fr_1fr_1fr]',
    columns === 5 && 'sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]',
    columns === 6 && 'sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]',
  )

  return (
    <div className="overflow-hidden rounded-xl border border-border" role="status" aria-label="Loading launches">
      <div className={cn(grid, 'bg-muted px-4 py-3')} aria-hidden="true">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton
            key={index}
            className={cn('h-2.5 max-w-14 bg-border motion-reduce:animate-none', index >= 4 && 'hidden sm:block')}
          />
        ))}
      </div>
      <div aria-hidden="true">
        {Array.from({ length: 4 }, (_, row) => (
          <div key={row} className={cn(grid, 'min-h-13 px-4')}>
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="size-8 shrink-0 rounded-lg bg-secondary motion-reduce:animate-none" />
              <Skeleton className="h-3 w-full max-w-24 bg-secondary motion-reduce:animate-none" />
            </div>
            {Array.from({ length: columns - 1 }, (_, cell) => (
              <Skeleton
                key={cell}
                className={cn('h-3 w-3/4 max-w-20 bg-secondary motion-reduce:animate-none', cell >= 3 && 'hidden sm:block')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
