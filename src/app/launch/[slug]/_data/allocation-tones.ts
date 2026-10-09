/** One tone per allocation, shared by the donut segment and its row swatch. */
export const allocationTones = [
  { swatch: 'bg-chart-2', color: 'var(--chart-2)' },
  { swatch: 'bg-chart-1', color: 'var(--chart-1)' },
  { swatch: 'bg-chart-6', color: 'var(--chart-6)' },
  { swatch: 'bg-ok', color: 'var(--ok)' },
  { swatch: 'bg-chart-5', color: 'var(--chart-5)' },
  { swatch: 'bg-chart-3', color: 'var(--chart-3)' },
] as const

export function toneFor(index: number) {
  return allocationTones[index % allocationTones.length]
}
