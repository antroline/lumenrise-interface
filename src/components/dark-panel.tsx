import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Ink "threshold" panel with a measured grid overlay. It carries the `dark`
 * class so every semantic token inside resolves to its dark value, keeping
 * nested badges, bars and muted text correct in both themes.
 */
export function DarkPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'dark relative isolate overflow-hidden rounded-3xl bg-ink text-foreground dark:bg-panel',
        className,
      )}
    >
      <div aria-hidden="true" className="grid-lines-dark pointer-events-none absolute inset-0 -z-10" />
      {children}
    </section>
  )
}
