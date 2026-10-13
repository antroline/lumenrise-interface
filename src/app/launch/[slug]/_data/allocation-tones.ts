/** Neutral and lime allocation tones shared by the diagram and its legend. */
export const allocationTones = [
  { swatch: 'bg-lime', color: 'var(--color-lime)' },
  { swatch: 'bg-foreground', color: 'var(--foreground)' },
  { swatch: 'bg-muted-foreground', color: 'var(--muted-foreground)' },
  { swatch: 'bg-border', color: 'var(--border)' },
  { swatch: 'bg-[var(--allocation-neutral)]', color: 'var(--allocation-neutral, #8b918c)' },
  { swatch: 'bg-[var(--allocation-pale)]', color: 'var(--allocation-pale, #c6cbc6)' },
] as const

export function toneFor(index: number) {
  return allocationTones[index % allocationTones.length]
}
