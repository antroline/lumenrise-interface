export const discoverViews = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
  { value: 'auction', label: 'Auction' },
  { value: 'launched', label: 'Trading' },
  { value: 'completed', label: 'Completed' },
] as const

export type DiscoverView = (typeof discoverViews)[number]['value']

export function parseView(value: string | undefined): DiscoverView {
  return discoverViews.find((view) => view.value === value)?.value ?? 'live'
}
