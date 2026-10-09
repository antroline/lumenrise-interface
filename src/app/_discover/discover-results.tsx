'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ProjectsTableSkeleton } from '@/components/projects-table'
import { Button } from '@/components/ui/button'
import { DiscoverFilters } from './discover-filters'
import type { DiscoverView } from './views'

const MIN_LOADING_MS = 300

export function DiscoverResults({
  view,
  models,
  hasResults,
  skeletonRows,
  children,
}: {
  view: DiscoverView
  models: string[]
  hasResults: boolean
  skeletonRows: number
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const currentQuery = useSearchParams().toString()
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    if (pendingQuery === null || pendingQuery !== currentQuery) return

    const remaining = Math.max(0, MIN_LOADING_MS - (performance.now() - startedAt.current))
    const timeout = window.setTimeout(() => setPendingQuery(null), remaining)
    return () => window.clearTimeout(timeout)
  }, [currentQuery, pendingQuery])

  const navigate = (next: URLSearchParams) => {
    const query = next.toString()
    if (query === currentQuery) return

    startedAt.current = performance.now()
    setPendingQuery(query)
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <>
      <div className="mt-8">
        <DiscoverFilters view={view} models={models} onNavigate={navigate} />
      </div>
      <section className="mt-6" aria-label="Launch results" aria-busy={pendingQuery !== null}>
        {pendingQuery !== null ? (
          <div role="status" aria-label="Loading launches">
            <ProjectsTableSkeleton rows={skeletonRows} />
          </div>
        ) : hasResults ? (
          children
        ) : (
          <div className="py-16 text-center">
            <p className="text-body text-muted-foreground">No launches match these filters.</p>
            <Button variant="link" size="sm" className="mt-2" onClick={() => navigate(new URLSearchParams())}>
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </>
  )
}
