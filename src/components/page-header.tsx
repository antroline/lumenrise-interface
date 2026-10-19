import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-caption font-medium tracking-eyebrow text-muted-foreground uppercase">
      <span aria-hidden="true" className="h-1 w-[18px] rounded-[1px] bg-foreground" />
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10', className)}>
      <div className="flex min-w-0 flex-col gap-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-display leading-[1.02] font-bold tracking-[-0.04em] sm:text-h1">{title}</h1>
        {description && <p className="max-w-[60ch] text-base leading-[1.55] text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        <h2 className="text-h2 font-semibold">{title}</h2>
        {description && <p className="mt-1 text-body text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-ui font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {children}
    </Link>
  )
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-ui font-medium text-foreground underline-offset-4 hover:underline [&>svg]:size-3.5',
        className,
      )}
    >
      {children}
    </Link>
  )
}
