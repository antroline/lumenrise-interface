import type { Auction } from '@/lib/data'
import { cn } from '@/lib/utils'

/** Price axis with the estimated clearing band highlighted in lime. */
export function ClearingRange({ band, axis, className }: Pick<Auction, 'band' | 'axis'> & { className?: string }) {
  return (
    <div className={cn('relative h-7', className)}>
      <div aria-hidden="true" className="absolute inset-x-0 top-[13px] h-0.5 bg-border" />
      {band && (
        <div
          aria-hidden="true"
          className="absolute top-2 h-3 rounded-xs border border-foreground bg-lime"
          style={{ left: `${band[0]}%`, width: `${band[1] - band[0]}%` }}
        />
      )}
      <span className="absolute top-5 left-0 font-mono text-3xs text-faint">{axis[0]}</span>
      <span className="absolute top-5 right-0 font-mono text-3xs text-faint">{axis[1]}</span>
    </div>
  )
}
