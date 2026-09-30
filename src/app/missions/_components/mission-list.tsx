'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
import { ArrowRight, Clock3, Code2, Fingerprint, GitBranch, Vote, Wallet } from 'lucide-react'
import { FarcasterIcon } from '@/components/brand-icons'
import { IconTile } from '@/components/icon-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignalNode } from '@/components/visual-system'
import { missionCategories, missions, type MissionIcon, type MissionStatus } from '../_data'

const icons: Record<MissionIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  code: Code2,
  git: GitBranch,
  wallet: Wallet,
  vote: Vote,
  fingerprint: Fingerprint,
  farcaster: FarcasterIcon,
}

type StatusFilter = 'not-completed' | 'all' | MissionStatus

export function MissionList() {
  const [category, setCategory] = useState<(typeof missionCategories)[number]>('All')
  const [status, setStatus] = useState<StatusFilter>('all')
  const shown = missions.filter((mission) =>
    (category === 'All' || mission.category === category) &&
    (status === 'all' || (status === 'not-completed' ? mission.status !== 'done' : mission.status === status)),
  )

  return (
    <section aria-label="Missions">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Mission category">
          {missionCategories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? 'dark' : 'outline'}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className="rounded-full"
            >
              {item}{item === 'All' ? ` ${missions.length}` : ''}
            </Button>
          ))}
        </div>
        <Select value={status} onValueChange={(value) => {
          if (value === 'all' || value === 'not-completed' || value === 'start' || value === 'progress' || value === 'done') setStatus(value)
        }}>
          <SelectTrigger size="sm" aria-label="Mission status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="not-completed">Not completed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="start">Not started</SelectItem>
            <SelectItem value="progress">In progress</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <Empty className="border"><EmptyHeader><EmptyTitle>No missions match</EmptyTitle><EmptyDescription>Try another category or status.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((mission) => {
            const Icon = icons[mission.icon]
            return (
              <Card key={mission.key} variant="ruled" className={mission.status === 'done' ? 'bg-muted' : undefined}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <span className="flex items-center gap-3"><SignalNode active={mission.status === 'progress'} /><IconTile><Icon /></IconTile></span>
                  <Badge variant="tag-outline">{mission.category}</Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="min-h-20">
                    <CardTitle>{mission.title}</CardTitle>
                    <p className="mt-2 text-ui text-muted-foreground">{mission.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-small">
                    <span><b>{mission.reward}</b> {mission.rewardLabel}</span>
                    <span className="text-muted-foreground">{mission.verifiedBy}</span>
                    <span className="ml-auto flex items-center gap-1 text-muted-foreground"><Clock3 className="size-3" />{mission.time}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-end gap-2">
                    {mission.progress && <Badge variant="info">{mission.progress}</Badge>}
                    {mission.status === 'done' ? <Badge variant="ok">Completed</Badge> : (
                      <Button variant="outline" size="sm" disabled title="Mission verification is not connected yet">
                        {mission.status === 'progress' ? 'Continue' : 'Start'} <ArrowRight data-icon="inline-end" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
