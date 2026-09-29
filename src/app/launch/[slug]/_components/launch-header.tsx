import { ProjectMark } from '@/components/project-mark'
import { StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import type { Launch } from '@/lib/data'

export function LaunchHeader({ launch, participation = false }: { launch: Launch; participation?: boolean }) {
  if (!participation) {
    return (
      <header className="relative flex items-start gap-4 border-b border-white/10 px-5 py-7 sm:gap-5 sm:px-8 sm:py-8">
        <ProjectMark name={launch.name} size={64} className="ring-1 ring-white/20" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[32px] leading-none font-semibold tracking-[-0.035em] sm:text-[42px]">{launch.name}</h1>
            <span className="rounded-md bg-white/10 px-2 py-1 text-small font-medium text-white/80">{launch.ticker}</span>
            <StatusPill status={launch.phase} />
          </div>
          <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-white/70">{launch.description}</p>
          <p className="mt-3 text-small text-white/55">{launch.model} · Stellar</p>
        </div>
      </header>
    )
  }

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
