'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { discoverViews, type DiscoverView } from './views'

const ALL_MODELS = 'all'

export function DiscoverFilters({ view, models }: { view: DiscoverView; models: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const model = searchParams.get('model') ?? ALL_MODELS
  const eligibleOnly = searchParams.get('eligible') === '1'

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ToggleGroup
          aria-label="Launch phase"
          value={[view]}
          onValueChange={(values) => {
            const [next] = values
            if (next) update('view', next === 'all' ? null : next)
          }}
        >
          {discoverViews.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
              <span className="font-mono text-caption text-faint">{option.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={model}
          onValueChange={(value) => update('model', !value || value === ALL_MODELS ? null : value)}
        >
          <SelectTrigger size="sm" aria-label="Allocation model">
            <SelectValue>{(value: string) => (value === ALL_MODELS ? 'Allocation model' : value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_MODELS}>All models</SelectItem>
              {models.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Label className="flex h-[34px] cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 text-ui font-medium text-secondary-foreground">
          <Switch checked={eligibleOnly} onCheckedChange={(checked) => update('eligible', checked ? '1' : null)} />
          Eligible for me
        </Label>
      </div>
    </div>
  )
}
