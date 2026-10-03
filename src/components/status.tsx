import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Activity, Check, Clock, Gavel, Info, RefreshCw, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { EligibilityState, LaunchPhase } from '@/lib/data'
import { cn } from '@/lib/utils'

const dotVariants = cva('inline-block size-2 shrink-0 rounded-full', {
  variants: {
    tone: {
      ok: 'bg-ok',
      lime: 'bg-lime shadow-[0_0_0_3px_rgba(214,255,0,0.22)]',
      warn: 'bg-warn',
      bad: 'bg-bad',
      info: 'bg-info',
      gray: 'bg-faint',
    },
  },
  defaultVariants: { tone: 'ok' },
})

export function StatusDot({ tone, className }: VariantProps<typeof dotVariants> & { className?: string }) {
  return <span aria-hidden="true" className={cn(dotVariants({ tone }), className)} />
}

const phases: Record<
  Exclude<LaunchPhase, 'live'>,
  { label: string; icon: LucideIcon; variant: ComponentProps<typeof Badge>['variant'] }
> = {
  upcoming: { label: 'Upcoming', icon: Clock, variant: 'default' },
  auction: { label: 'Auction', icon: Gavel, variant: 'soft' },
  launched: { label: 'Trading', icon: Activity, variant: 'soft' },
  completed: { label: 'Completed', icon: Check, variant: 'soft' },
  settling: { label: 'Settling', icon: RefreshCw, variant: 'warn' },
}

export function StatusPill({ status, className }: { status: LaunchPhase; className?: string }) {
  if (status === 'live') {
    return (
      <Badge variant="live" size="sm" className={className}>
        <StatusDot tone="lime" />
        Live
      </Badge>
    )
  }
  const phase = phases[status]
  return (
    <Badge variant={phase.variant} size="sm" className={className}>
      <phase.icon />
      {phase.label}
    </Badge>
  )
}

const statusTextVariants = cva(
  'inline-flex items-center gap-1.5 text-ui font-medium [&>svg]:size-3.5 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        ok: 'text-ok',
        bad: 'text-bad',
        warn: 'text-warn',
        info: 'text-info',
        muted: 'text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
)

export function StatusText({
  tone,
  icon: Icon,
  children,
  className,
}: VariantProps<typeof statusTextVariants> & { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn(statusTextVariants({ tone }), className)}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  )
}

const eligibility: Record<EligibilityState, { tone: 'ok' | 'bad' | 'warn' | 'muted'; icon: LucideIcon; label: string }> = {
  ok: { tone: 'ok', icon: Check, label: 'Eligible' },
  no: { tone: 'bad', icon: X, label: 'Not eligible' },
  part: { tone: 'warn', icon: TriangleAlert, label: 'Partially eligible' },
  na: { tone: 'muted', icon: Info, label: 'Check eligibility' },
}

export function Eligibility({
  state,
  children,
  className,
}: {
  state: EligibilityState
  children?: ReactNode
  className?: string
}) {
  const config = eligibility[state]
  return (
    <StatusText tone={config.tone} icon={config.icon} className={className}>
      {children ?? config.label}
    </StatusText>
  )
}

/** Mono provenance label ("VERIFIED · ON-CHAIN"), green when verified. */
export function SourceLabel({
  verified,
  icon: Icon,
  children,
  className,
}: {
  verified?: boolean
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] font-mono text-2xs tracking-[0.04em] uppercase [&>svg]:size-3',
        verified ? 'text-ok' : 'text-faint',
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  )
}
