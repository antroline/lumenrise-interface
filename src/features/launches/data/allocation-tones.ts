/** Neutral and lime allocation tones shared by the diagram and its legend. */
export const allocationTones = [
  { swatch: 'bg-lime', color: 'var(--color-lime)' },
  { swatch: 'bg-foreground', color: 'var(--foreground)' },
  { swatch: 'bg-muted-foreground', color: 'var(--muted-foreground)' },
  { swatch: 'bg-border', color: 'var(--border)' },
  { swatch: 'bg-chart-3', color: 'var(--chart-3)' },
  { swatch: 'bg-chart-6', color: 'var(--chart-6)' },
] as const

export function toneFor(index: number) {
  return allocationTones[index % allocationTones.length]
}
