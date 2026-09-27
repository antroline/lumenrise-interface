import { DarkPanel } from '@/components/dark-panel'
import { ProjectMark } from '@/components/project-mark'
import { Label } from '@/components/stat'
import { StatusDot } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Launch } from '@/lib/data'
import { FeaturedWalletCard } from './featured-wallet-card'

export function FeaturedLaunch({ launch }: { launch: Launch }) {
  const facts = [
    { label: launch.dateLabel, value: launch.date, mono: true },
    { label: 'Participants', value: launch.participants },
    { label: 'Allocation', value: launch.allocation },
    { label: 'Requirement', value: launch.requirement },
  ]

  return (
    <DarkPanel className="grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_340px] lg:gap-10 lg:px-10">
      <svg
        aria-hidden="true"
        width="520"
        height="520"
        viewBox="0 0 520 520"
        className="pointer-events-none absolute -top-[120px] right-[250px] -z-10 opacity-90"
      >
        <circle cx="260" cy="260" r="259" fill="none" stroke="rgba(255,255,255,.08)" />
        <circle cx="260" cy="260" r="190" fill="none" stroke="rgba(255,255,255,.06)" />
      </svg>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="live" size="sm">
            <StatusDot tone="lime" />
            Live
          </Badge>
          <Badge variant="tag">Featured</Badge>
          <Badge variant="tag">{launch.model}</Badge>
          <Badge variant="tag">Soroban</Badge>
        </div>

        <div className="flex items-center gap-4">
          <ProjectMark name={launch.name} size={60} />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-[28px] leading-none font-bold tracking-[-0.04em] sm:text-display">
              {launch.name}{' '}
              <span className="font-mono text-[15px] font-medium tracking-normal text-muted-foreground">{launch.ticker}</span>
            </h2>
            <p className="text-[15px] text-muted-foreground">{launch.description}</p>
          </div>
        </div>

        <div className="flex max-w-[560px] flex-col gap-2">
          <div className="flex items-center justify-between text-ui">
            <span>
              <b className="text-[15px] tabular-nums">{launch.raised}</b>{' '}
              <span className="text-muted-foreground">raised of {launch.target}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{launch.progress}%</span>
          </div>
          <Progress value={launch.progress} size="thick" aria-label={`${launch.progress}% raised`} />
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:flex sm:flex-wrap">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>
                <Label>{fact.label}</Label>
              </dt>
              <dd className={fact.mono ? 'mt-2 font-mono text-ui' : 'mt-2 font-semibold'}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <FeaturedWalletCard launch={launch} />
    </DarkPanel>
  )
}
