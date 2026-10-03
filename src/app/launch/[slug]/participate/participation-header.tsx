import { ProjectMark } from '@/components/project-mark'
import { StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import type { Launch } from '@/lib/data'

export function ParticipationHeader({ launch }: { launch: Launch }) {
  return (
    <header className="flex items-start gap-4 sm:items-center">
      <ProjectMark name={launch.name} size={64} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[30px] leading-tight font-bold tracking-[-0.04em] sm:text-[38px]">
            {`Participate in ${launch.name}`}
          </h1>
          <StatusPill status={launch.phase} />
          <Badge variant="net">TESTNET</Badge>
        </div>
      </div>
    </header>
  )
}
