import { discoverCounts } from '@/lib/data'

export const discoverViews = [
  { value: 'all', label: 'All', count: discoverCounts.all },
  { value: 'live', label: 'Live', count: discoverCounts.live },
  { value: 'upcoming', label: 'Upcoming', count: discoverCounts.upcoming },
  { value: 'auction', label: 'Auction', count: discoverCounts.auction },
  { value: 'launched', label: 'Recently launched', count: discoverCounts.launched },
  { value: 'completed', label: 'Completed', count: discoverCounts.completed },
] as const

export type DiscoverView = (typeof discoverViews)[number]['value']

export function parseView(value: string | undefined): DiscoverView {
  return discoverViews.find((view) => view.value === value)?.value ?? 'all'
}
