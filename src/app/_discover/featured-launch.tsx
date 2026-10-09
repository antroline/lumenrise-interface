import { DarkPanel } from '@/components/dark-panel'
import { ProjectMark } from '@/components/project-mark'
import { Label } from '@/components/stat'
import { StatusDot } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Launch } from '@/lib/data'
import { FeaturedProjectLink } from './featured-project-link'

export function FeaturedLaunch({ launch }: { launch: Launch }) {
  return (
    <DarkPanel className="grid gap-5 border border-panel-line p-5 sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[1fr_auto] lg:gap-x-10 lg:gap-y-8">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="flex items-center gap-3">
          <ProjectMark name={launch.name} size={56} />
          <Badge variant="live" size="sm">
            <StatusDot tone="lime" />
            Live
          </Badge>
          <span className="text-body text-muted-foreground">{launch.model}</span>
        </div>

        <h2 className="mt-4 text-[30px] leading-none font-bold tracking-[-0.04em] sm:mt-5 sm:text-[36px]">
          {launch.name}{' '}
          <span className="text-body font-medium tracking-normal text-muted-foreground">{launch.ticker}</span>
        </h2>
        <p className="mt-2 max-w-md text-body text-muted-foreground sm:text-[15px]">{launch.description}</p>
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div>
          <p className="text-body text-muted-foreground">Raised</p>
          <strong className="mt-1 block text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:text-[36px]">
            {launch.raised}
          </strong>
        </div>
        <div className="mt-4">
          <Progress value={launch.progress} size="thick" aria-label={`${launch.progress}% raised`} />
        </div>
        <p className="mt-2 text-body text-muted-foreground tabular-nums">{launch.progress}% of {launch.target} target</p>

        <dl className="mt-4 divide-y divide-panel-line border-t border-panel-line">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt><Label>{launch.dateLabel}</Label></dt>
            <dd className="text-right text-body font-medium">{launch.date}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt><Label>Participants</Label></dt>
            <dd className="text-body font-medium tabular-nums">{launch.participants}</dd>
          </div>
        </dl>
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        <FeaturedProjectLink launch={launch} />
      </div>
    </DarkPanel>
  )
}
