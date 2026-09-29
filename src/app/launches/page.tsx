import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProjectsTable, ProjectsTableSkeleton } from '@/components/projects-table'
import { ResultsLink, ResultsStack, ResultsTransition } from '@/components/results-transition'
import { projectColumns, type ProjectColumn, type SortDirection } from '@/lib/project-table'
import { cn } from '@/lib/utils'
import { projects, type ProjectCategory, type ProjectListing } from './_data/projects'

type Category = 'All' | ProjectCategory
type SearchParams = Promise<{ category?: string; sort?: string; dir?: string; page?: string }>

const PAGE_SIZE = 10
const categories: Category[] = ['All', 'Launch', 'Auction', 'Trading']
const categoryLabels: Record<Category, string> = {
  All: 'All projects', Launch: 'Launches', Auction: 'Auctions', Trading: 'Trading',
}

const pagerItem = 'grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-lime'

const phaseRank: Record<ProjectListing['phase'], number> = {
  live: 0, upcoming: 1, auction: 2, launched: 3, settling: 4, completed: 5,
}

function defaultDirection(sort: ProjectColumn): SortDirection {
  return sort === 'figure' || sort === 'participants' || sort === 'date' ? 'desc' : 'asc'
}

function sortValue(project: ProjectListing, sort: ProjectColumn): string | number | null {
  switch (sort) {
    case 'name': return project.name
    case 'category': return project.category
    case 'phase': return phaseRank[project.phase]
    case 'figure': return project.figureValue
    case 'participants': return project.participants
    case 'date': return project.dateValue
  }
}

function sortProjects(rows: ProjectListing[], sort: ProjectColumn, direction: SortDirection) {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort)
    const right = sortValue(b, sort)
    if (left === null) return right === null ? a.name.localeCompare(b.name) : 1
    if (right === null) return -1
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right))
    return (direction === 'asc' ? comparison : -comparison) || a.name.localeCompare(b.name)
  })
}

function projectsUrl(category: Category, sort: ProjectColumn, direction: SortDirection, page: number) {
  const query = new URLSearchParams({ category, sort, dir: direction, page: String(page) })
  return `/launches?${query}`
}

function paginationItems(page: number, pageCount: number): Array<number | 'ellipsis'> {
  const visible = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === pageCount || Math.abs(number - page) <= 1)
  return visible.flatMap((number, index) =>
    index > 0 && number - visible[index - 1] > 1 ? ['ellipsis' as const, number] : [number],
  )
}

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const category = categories.find((item) => item.toLowerCase() === params.category?.toLowerCase()) ?? 'All'
  const requestedSort = projectColumns.find((column) => column.key === params.sort)?.key
  const sort = requestedSort ?? 'name'
  const direction = params.dir === 'asc' || params.dir === 'desc' ? params.dir : defaultDirection(sort)
  const matching = category === 'All' ? projects : projects.filter((project) => project.category === category)
  const sorted = sortProjects(matching, sort, direction)
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const requestedPage = Number(params.page)
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, pageCount)
    : 1
  const first = (page - 1) * PAGE_SIZE
  const visible = sorted.slice(first, first + PAGE_SIZE)

  return (
    <ResultsTransition>
      <div className="w-full pb-12">
        <h1 className="sr-only">Projects</h1>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Project category" className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:max-w-full sm:px-0">
            <div className="flex w-fit gap-0.5 rounded-lg bg-secondary p-[3px]">
              {categories.map((item) => {
                const active = item === category
                const count = item === 'All' ? projects.length : projects.filter((project) => project.category === item).length
                return (
                  <ResultsLink
                    key={item}
                    href={projectsUrl(item, sort, direction, 1)}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-lime',
                      active
                        ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-card'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {categoryLabels[item]}
                    <span className="text-caption text-faint tabular-nums">{count}</span>
                  </ResultsLink>
                )
              })}
            </div>
          </nav>
          <p className="caps tabular-nums">{projects.length} projects</p>
        </div>

        <section className="mt-4" aria-label="Project results">
          <ResultsStack skeleton={<ProjectsTableSkeleton rows={visible.length} />}>
            <ProjectsTable
              rows={visible}
              caption={`Projects sorted by ${projectColumns.find((column) => column.key === sort)?.label} ${direction === 'asc' ? 'ascending' : 'descending'}`}
              sorting={{
                column: sort,
                direction,
                explicit: requestedSort !== undefined,
                link: (column) => {
                  const next = column === sort
                    ? direction === 'asc' ? 'desc' : 'asc'
                    : defaultDirection(column)
                  return { href: projectsUrl(category, column, next, 1), direction: next }
                },
              }}
            />
          </ResultsStack>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="caps tabular-nums">
              Showing {first + 1}–{first + visible.length} of {sorted.length} projects · Preview data
            </p>
            <nav aria-label="Pagination" className="flex items-center gap-1 text-ui">
              {page > 1 ? (
                <ResultsLink href={projectsUrl(category, sort, direction, page - 1)} scroll={false} aria-label="Previous page" className={cn(pagerItem, 'text-foreground hover:bg-secondary')}><ChevronLeft className="size-4" /></ResultsLink>
              ) : (
                <span aria-label="Previous page unavailable" className={cn(pagerItem, 'bg-secondary text-faint')}><ChevronLeft className="size-4" /></span>
              )}
              {paginationItems(page, pageCount).map((number, index) => number === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} aria-hidden="true" className="grid size-8 place-items-center text-muted-foreground">…</span>
              ) : (
                <ResultsLink
                  key={number}
                  href={projectsUrl(category, sort, direction, number)}
                  scroll={false}
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? 'page' : undefined}
                  className={cn(
                    pagerItem,
                    'font-medium tabular-nums',
                    number === page ? 'bg-orange text-ink' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {number}
                </ResultsLink>
              ))}
              {page < pageCount ? (
                <ResultsLink href={projectsUrl(category, sort, direction, page + 1)} scroll={false} aria-label="Next page" className={cn(pagerItem, 'text-foreground hover:bg-secondary')}><ChevronRight className="size-4" /></ResultsLink>
              ) : (
                <span aria-label="Next page unavailable" className={cn(pagerItem, 'bg-secondary text-faint')}><ChevronRight className="size-4" /></span>
              )}
            </nav>
          </div>
        </section>
      </div>
    </ResultsTransition>
  )
}
