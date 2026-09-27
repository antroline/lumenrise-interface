'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type CategoryView = 'all' | 'work'

export function CategoryFilter({ view }: { view: CategoryView }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <ToggleGroup
      aria-label="Category filter"
      value={[view]}
      onValueChange={(values) => {
        const [next] = values
        if (!next) return
        const params = new URLSearchParams(searchParams)
        if (next === 'all') params.delete('cat')
        else params.set('cat', next)
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      }}
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="work">Needs work</ToggleGroupItem>
    </ToggleGroup>
  )
}
