import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statVariants = cva('flex min-w-0 flex-col gap-1.5', {
  variants: {
    tone: {
      plain: '',
      default: 'bg-card px-[22px] py-5',
      muted: 'bg-muted px-[22px] py-5',
      highlight: 'bg-accent px-[22px] py-5',
      bad: 'bg-bad-soft px-[22px] py-5 [&_[data-slot=stat-label]]:text-bad',
    },
  },
  defaultVariants: { tone: 'default' },
})

export function Stat({
  label,
  value,
  unit,
  hint,
  tone,
  className,
}: VariantProps<typeof statVariants> & {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn(statVariants({ tone }), className)}>
      <span data-slot="stat-label" className="caps flex items-center gap-1.5">
        {label}
      </span>
      <span className="text-stat font-semibold tabular-nums">
        {value}
        {unit && <small className="ml-1 text-ui font-medium tracking-normal text-muted-foreground">{unit}</small>}
      </span>
      {hint && <span className="text-small text-muted-foreground">{hint}</span>}
    </div>
  )
}

const columns = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
} as const

/** Ruled strip of stats; hairline dividers come from the 1px grid gap. */
export function StatBar({ columns: count, className, children }: { columns: keyof typeof columns; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden border-y border-divider bg-divider sm:grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1',
        columns[count],
        className,
      )}
    >
      {children}
    </div>
  )
}

export function KeyValue({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-divider py-[11px] text-body last:border-b-0',
        className,
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  )
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('caps', className)}>{children}</div>
}
