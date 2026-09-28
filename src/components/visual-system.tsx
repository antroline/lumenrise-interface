import type { ComponentProps, ReactNode } from 'react'
import { ProjectMark, type ProjectMarkName } from '@/components/project-mark'
import { cn } from '@/lib/utils'

/** A measured field for page focal areas, never for text-heavy or interactive regions. */
export function CoordinateField({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('coordinate-field pointer-events-none absolute inset-0', className)} />
}

export function SignalNode({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block size-2.5 shrink-0 rounded-full border border-foreground bg-background',
        active && 'border-lime bg-lime ring-[3px] ring-lime/20',
        className,
      )}
    />
  )
}

export function RuledPanel({ children, className, ...props }: ComponentProps<'div'>) {
  return <div data-surface="ruled" className={cn('border-y border-divider py-5 sm:py-6', className)} {...props}>{children}</div>
}

export function InsetField({ children, className, ...props }: ComponentProps<'div'>) {
  return <div data-surface="inset" className={cn('border border-divider bg-muted p-5 sm:p-6', className)} {...props}>{children}</div>
}

export type TrajectoryStep = { label: ReactNode; detail?: ReactNode }

/** The active node identifies a position in a real sequence, not a decorative progress bar. */
export function Trajectory({
  steps,
  active,
  label,
  className,
}: {
  steps: TrajectoryStep[]
  active: number
  label: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0 overflow-x-auto [scrollbar-width:none]', className)}>
      <ol aria-label={label} className="flex min-w-[330px]">
        {steps.map((step, index) => (
          <li key={index} aria-current={index === active ? 'step' : undefined} className="min-w-0 flex-1">
            <div className="flex h-4 items-center">
              <SignalNode active={index === active} className={index < active ? 'border-foreground bg-foreground' : undefined} />
              {index < steps.length - 1 && <span aria-hidden="true" className={cn('mx-1 h-px flex-1 bg-border', index < active && 'bg-foreground')} />}
            </div>
            <div className="mt-2 pr-2">
              <span className={cn('block text-small font-semibold', index > active && 'text-muted-foreground')}>{step.label}</span>
              {step.detail && <span className="mt-0.5 block font-mono text-2xs text-muted-foreground">{step.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export type EvidenceRow = { label: ReactNode; detail?: ReactNode; value?: ReactNode; source?: ReactNode; active?: boolean }

export function EvidenceLedger({ rows, className }: { rows: EvidenceRow[]; className?: string }) {
  return (
    <ol className={cn('border-t border-divider', className)}>
      {rows.map((row, index) => (
        <li key={index} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-b border-divider py-3.5 sm:grid-cols-[30px_minmax(0,1fr)_minmax(72px,auto)_minmax(90px,auto)] sm:gap-x-4">
          <span className="font-mono text-2xs text-faint tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0"><div className="flex items-center gap-2 text-ui font-semibold"><SignalNode active={row.active} className="size-2" />{row.label}</div>{row.detail && <div className="mt-1 pl-4 text-small text-muted-foreground">{row.detail}</div>}</div>
          {row.value && <span className="text-right text-ui font-semibold tabular-nums">{row.value}</span>}
          {row.source && <span className="col-start-2 font-mono text-2xs text-muted-foreground sm:col-auto sm:text-right">{row.source}</span>}
        </li>
      ))}
    </ol>
  )
}

/** Only use when each named source actually contributes to the named outcome. */
export function SignalTopology({ sources, outcome, className }: { sources: string[]; outcome: string; className?: string }) {
  return (
    <div role="group" className={cn('grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-center gap-3', className)} aria-label={`${sources.join(', ')} contribute to ${outcome}`}>
      <div className="border-y border-divider">
        {sources.map((source) => <div key={source} className="flex items-center gap-2 border-b border-divider py-2.5 font-mono text-2xs last:border-b-0"><SignalNode className="size-2" />{source}</div>)}
      </div>
      <span aria-hidden="true" className="relative h-[calc(100%-20px)] border-l border-divider before:absolute before:top-1/2 before:right-full before:w-4 before:border-t before:border-divider after:absolute after:top-1/2 after:left-0 after:w-7 after:border-t after:border-divider" />
      <div className="flex min-w-0 items-center gap-2 border-y border-divider py-4"><SignalNode active /><span className="text-ui font-semibold">{outcome}</span></div>
    </div>
  )
}

/** The existing project artwork becomes a restrained page-level specimen. */
export function ProjectSpecimen({ name, children, className }: { name: ProjectMarkName; children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative isolate overflow-hidden border-y border-divider py-6 sm:py-8', className)}>
      <CoordinateField className="left-[42%] opacity-70" />
      <ProjectMark name={name} size={176} className="pointer-events-none absolute -top-10 -right-16 -z-10 opacity-[0.045] sm:right-10 sm:opacity-[0.09]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
