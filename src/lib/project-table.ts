export type ProjectPhase = 'live' | 'upcoming' | 'auction' | 'launched' | 'completed' | 'settling' | 'refunded' | 'unavailable' | 'failed';
export type ProjectColumn =
  'name' | 'category' | 'phase' | 'figure' | 'participants' | 'date';
export type SortDirection = 'asc' | 'desc';

export type ProjectTableRow = {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  xAccount?: string;
  dateTitle?: string;
  figureTitle?: string;
  statusLabel?: string;
  graduation?: {
    target: string;
    progressBps: number;
    stale: boolean;
    graduated?: boolean;
    status?: string;
    targetTitle?: string;
  };
  /** Display name when it differs from the project mark, such as a named raise. */
  title?: string;
  ticker?: string;
  href?: string;
  category: string;
  phase: ProjectPhase;
  figure: string;
  figureContext: string;
  participants: number | null;
  date: string;
  dateLabel?: string;
  model?: string;
  snapshot?: string;
  snapshotContext?: string;
  snapshotDirection?: 'up' | 'down';
};

export const projectColumns: { key: ProjectColumn; label: string }[] = [
  { key: 'name', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'phase', label: 'Status' },
  { key: 'figure', label: 'Key figure' },
  { key: 'participants', label: 'Participants' },
  { key: 'date', label: 'Date' },
];

export function graduationLabel(
  graduation: NonNullable<ProjectTableRow['graduation']>,
  phase: ProjectPhase,
) {
  const graduated = graduation.graduated ?? phase === 'launched';
  return graduated
    ? 'Graduated'
    : graduation.status && graduation.status !== 'Open'
      ? graduation.status
      : Math.min(100, graduation.progressBps / 100).toLocaleString('en-US', {
          maximumFractionDigits: 2,
        }) + '% Filled';
}
