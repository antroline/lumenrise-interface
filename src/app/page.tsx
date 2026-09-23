'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { LaunchRow } from '@/components/LaunchRow'
import { PageFrame } from '@/components/PageFrame'
import { filterLabels, launches, type LaunchStatus } from '@/lib/data'

export default function DiscoverPage() {
  const [filter, setFilter] = useState<'All' | LaunchStatus>('All')
  const [query, setQuery] = useState('')
  const filteredLaunches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return launches.filter((launch) => {
      const matchesFilter = filter === 'All' || launch.status === filter
      const matchesSearch = !normalized || [launch.name, launch.symbol, launch.description, launch.allocation]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
      return matchesFilter && matchesSearch
    })
  }, [filter, query])

  return (
    <PageFrame className="discover-page">
      <section className="discover-intro">
        <div>
          <h1>Open launches</h1>
          <p className="lead">
            Review the rules, understand your eligibility, and choose whether to participate. No account needed to
            explore.
          </p>
        </div>
        <div
          className="flex min-w-[210px] flex-col items-end gap-1.5 pb-2 text-[10px] uppercase tracking-[0.11em] text-faint max-[860px]:items-start"
          aria-label="Launchpad principles"
        >
          <span>Transparent rules</span>
          <span>Verifiable eligibility</span>
          <span>User-owned identity</span>
        </div>
      </section>

      <section className="launch-directory" aria-labelledby="launch-directory-title">
        <h2 id="launch-directory-title" className="sr-only">Launch directory</h2>
        <div className="directory-tools">
          <div className="filter-list" role="group" aria-label="Filter launches">
            {filterLabels.map((label) => {
              const count = label === 'All' ? launches.length : launches.filter((item) => item.status === label).length
              return (
                <button
                  key={label}
                  type="button"
                  className={filter === label ? 'active' : undefined}
                  aria-pressed={filter === label}
                  onClick={() => setFilter(label)}
                >
                  {label}<span>{count}</span>
                </button>
              )
            })}
          </div>
          <label className="search-field">
            <Icon name="search" size={17} />
            <span className="sr-only">Search launches</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or tokens" />
          </label>
        </div>

        <div className="launch-table">
          <div className="launch-head" aria-hidden="true">
            <span>Project</span>
            <span>Raise progress</span>
            <span>Launch timing</span>
            <span>Allocation</span>
            <span>Eligibility</span>
            <span>Participants</span>
            <span>Action</span>
          </div>
          {filteredLaunches.map((launch) => (
            <LaunchRow key={launch.slug} launch={launch} />
          ))}
          {filteredLaunches.length === 0 && (
            <div className="grid min-h-[250px] place-items-center content-center gap-2 border-b border-line text-center text-muted">
              <Icon name="search" size={24} />
              <h3 className="m-0 text-ink">No matching launches</h3>
              <p className="m-0">Try another token name or reset the current filter.</p>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-[5px] bg-transparent p-0 text-cobalt underline decoration-1 underline-offset-4"
                onClick={() => { setFilter('All'); setQuery('') }}
              >
                Show every launch
              </button>
            </div>
          )}
        </div>
        <p className="mb-[54px] mt-[18px] text-[10px] text-faint">
          Illustrative project and raise data for this interface prototype.
        </p>
      </section>
    </PageFrame>
  )
}
