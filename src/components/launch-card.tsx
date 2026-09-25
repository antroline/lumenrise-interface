import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProjectMark } from '@/components/project-mark'
import { Eligibility, StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Launch } from '@/lib/data'

function Meta({ label, children, mono }: { label: string; children: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-[3px] font-mono text-3xs tracking-[0.12em] text-faint uppercase">{label}</div>
      <div className={mono ? 'font-mono text-small' : 'text-ui font-semibold tabular-nums'}>{children}</div>
    </div>
  )
}

export function LaunchCard({ launch }: { launch: Launch }) {
  return (
    <Link
      href={`/launch/${launch.slug}`}
      className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-faint focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <ProjectMark name={launch.name} size={44} />
        <div className="flex min-w-0 grow flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-title leading-[1.2] font-semibold tracking-[-0.02em]">{launch.name}</span>
            <StatusPill status={launch.phase} />
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="tag">{launch.ticker}</Badge>
            <span className="truncate text-small text-muted-foreground">{launch.model}</span>
          </div>
        </div>
      </div>

      <p className="text-ui leading-[1.45] text-muted-foreground">{launch.description}</p>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-small text-muted-foreground">
          <span>
            <b className="font-semibold text-foreground tabular-nums">{launch.raised}</b> of {launch.target}
          </span>
          <span className="font-mono text-xs tabular-nums">{launch.progress}%</span>
        </div>
        <Progress value={launch.progress} aria-label={`${launch.progress}% raised`} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider pt-3.5">
        <Meta label={launch.dateLabel} mono>
          {launch.date}
        </Meta>
        <Meta label="Participants">{launch.participants}</Meta>
        <Meta label="Allocation">{launch.allocation}</Meta>
        <Meta label="Requirement">{launch.requirement}</Meta>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-divider pt-3.5">
        <Eligibility state={launch.eligibility.state}>{launch.eligibility.label}</Eligibility>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}
