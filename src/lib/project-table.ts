import type { ProjectMarkName } from '@/components/project-mark'
import type { LaunchPhase } from '@/lib/data'

export type ProjectPhase = LaunchPhase | 'refunded'
export type ProjectColumn = 'name' | 'category' | 'phase' | 'figure' | 'participants' | 'date'
export type SortDirection = 'asc' | 'desc'

export type ProjectTableRow = {
  id: string
  name: ProjectMarkName
  /** Display name when it differs from the project mark, such as a named raise. */
  title?: string
  ticker?: string
  href?: string
  category: string
  phase: ProjectPhase
  figure: string
  figureContext: string
  participants: number | null
  date: string
  dateLabel?: string
}

export const projectColumns: { key: ProjectColumn; label: string }[] = [
  { key: 'name', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'phase', label: 'Status' },
  { key: 'figure', label: 'Key figure' },
  { key: 'participants', label: 'Participants' },
  { key: 'date', label: 'Date' },
]
