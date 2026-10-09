'use client'

import { ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { discoverViews, type DiscoverView } from './views'

const ALL_MODELS = 'all'

export function DiscoverFilters({
  view,
  models,
  onNavigate,
}: {
  view: DiscoverView
  models: string[]
  onNavigate: (next: URLSearchParams) => void
}) {
  const searchParams = useSearchParams()
  const model = searchParams.get('model') ?? ALL_MODELS
  const eligibleOnly = searchParams.get('eligible') === '1'
  const filterCount = Number(model !== ALL_MODELS) + Number(eligibleOnly)
  const canFilter = view === 'live' || view === 'upcoming' || view === 'auction'

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    onNavigate(next)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ToggleGroup
          aria-label="Launch phase"
          value={[view]}
          onValueChange={(values) => {
            const [selected] = values
            if (!selected) return
            const next = new URLSearchParams(searchParams)
            if (selected === 'live') next.delete('view')
            else next.set('view', selected)
            next.delete('model')
            if (selected === 'all' || selected === 'launched' || selected === 'completed') {
              next.delete('eligible')
            }
            onNavigate(next)
          }}
        >
          {discoverViews.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {canFilter && (
        <details key={view} className="group relative self-start">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-ui font-medium select-none focus-visible:ring-2 focus-visible:ring-lime [&::-webkit-details-marker]:hidden">
            Filters{filterCount > 0 && <span className="text-muted-foreground">({filterCount})</span>}
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="absolute top-full right-0 z-20 mt-2 flex w-64 flex-col gap-4 rounded-xl border bg-popover p-4 shadow-md">
            <div className="grid gap-2">
              <Label className="text-small">Allocation model</Label>
              <Select
                value={model}
                onValueChange={(value) => update('model', !value || value === ALL_MODELS ? null : value)}
              >
                <SelectTrigger size="sm" aria-label="Allocation model" className="w-full">
                  <SelectValue>{(value: string) => (value === ALL_MODELS ? 'All models' : value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_MODELS}>All models</SelectItem>
                    {models.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Label className="flex cursor-pointer items-center justify-between gap-3 text-ui">
              Eligible for me
              <Switch checked={eligibleOnly} onCheckedChange={(checked) => update('eligible', checked ? '1' : null)} />
            </Label>
          </div>
        </details>
      )}
    </div>
  )
}
