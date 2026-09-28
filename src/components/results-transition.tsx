'use client'

import { createContext, use, useState, type ComponentProps, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type ResultsTransitionState = {
  pending: boolean
  resultKey: string
  start: (href: string) => void
}

const ResultsTransitionContext = createContext<ResultsTransitionState | null>(null)

/** Tracks navigations started by `ResultsLink` so `ResultsStack` can show a skeleton until the new URL renders. */
export function ResultsTransition({ children }: { children: ReactNode }) {
  const resultKey = `${usePathname()}?${useSearchParams()}`
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)

  const start = (href: string) => {
    const next = new URL(href, window.location.href)
    if (next.pathname + next.search === window.location.pathname + window.location.search) return
    setPendingFrom(resultKey)
  }

  return (
    <ResultsTransitionContext value={{ pending: pendingFrom === resultKey, resultKey, start }}>
      {children}
    </ResultsTransitionContext>
  )
}

export function ResultsLink({ onNavigate, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const transition = use(ResultsTransitionContext)
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        onNavigate?.(event)
        transition?.start(props.href)
      }}
    />
  )
}

/**
 * Cross-fades the skeleton and the results in one grid cell. The reveal is pure CSS so a
 * server-rendered reload plays it before hydration; keying on the URL replays it per result set.
 */
export function ResultsStack({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  const transition = use(ResultsTransitionContext)
  const pending = transition?.pending ?? false
  const key = `${pending ? 'pending' : 'ready'}:${transition?.resultKey ?? ''}`

  return (
    <div aria-busy={pending} className="grid *:col-start-1 *:row-start-1">
      <div
        key={`results-${key}`}
        className={cn(
          'min-w-0',
          pending ? 'animate-results-out motion-reduce:invisible' : 'animate-results-in motion-reduce:animate-none',
        )}
      >
        {children}
      </div>
      <div
        key={`skeleton-${key}`}
        aria-hidden="true"
        className={cn(
          'pointer-events-none min-w-0',
          pending ? 'animate-skeleton-in motion-reduce:animate-none' : 'animate-skeleton-out motion-reduce:hidden',
        )}
      >
        {skeleton}
      </div>
    </div>
  )
}
