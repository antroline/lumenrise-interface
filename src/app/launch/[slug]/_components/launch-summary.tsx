import type { ComponentType, SVGProps, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, BookOpen, Globe } from 'lucide-react'
import { DiscordIcon, TelegramIcon, XLogoIcon } from '@/components/brand-icons'
import { ProjectMark } from '@/components/project-mark'
import { Eligibility, StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardVariants } from '@/components/ui/card'
import type { Launch } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { LaunchContent, LaunchLinkKind } from '../_data/launch-content'

export type LaunchView = Omit<Launch, 'name' | 'progress'> & { name: string; progress: number | null }

const linkKinds: Record<LaunchLinkKind, { name: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  website: { name: 'Website', Icon: Globe },
  docs: { name: 'Documentation', Icon: BookOpen },
  x: { name: 'X', Icon: XLogoIcon },
  discord: { name: 'Discord', Icon: DiscordIcon },
  telegram: { name: 'Telegram', Icon: TelegramIcon },
}

/**
 * Identity and decision panel. It stays beside the evaluation content while the page
 * scrolls, so the project, the visitor's standing and the action never leave the view.
 */
export function LaunchSummary({
  launch,
  content,
  className,
  network = 'testnet', mark, status, action,
  eligibilityNote,
}: {
  launch: LaunchView
  network?: string
  mark?: ReactNode
  status?: ReactNode
  action?: ReactNode
  content: LaunchContent
  className?: string
  eligibilityNote?: string
}) {
  const live = launch.phase === 'live'
  const verifiedRecords = content.evidence?.filter((item) => item.source === 'verified').length ?? 0

  return (
    <section
      aria-labelledby="project-name"
      className={cn(cardVariants({ variant: 'surface', size: 'none' }), className)}
    >
      <div className="px-6 py-6 sm:px-7">
        <div className="flex items-start gap-4 sm:gap-5">
          <>{mark ?? <ProjectMark name={launch.name} size={72} className="shrink-0" />}</>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {verifiedRecords > 0 && (
                <Badge variant="ok" size="sm">
                  <BadgeCheck />
                  {verifiedRecords} verified records
                </Badge>
              )}
              {status ?? <StatusPill status={launch.phase} />}
              <Badge variant="net" size="sm">{network === 'public' ? 'MAINNET' : network.toUpperCase()}</Badge>
            </div>
            <h1 id="project-name" className="mt-2.5 break-words text-[30px] leading-[1.05] font-semibold tracking-[-0.03em]">
              {launch.name}
            </h1>
            <p className="mt-1.5 text-[16px] font-medium text-muted-foreground">${launch.ticker}</p>
            {action && <p className="mt-2 text-small text-muted-foreground">{launch.model}</p>}
          </div>
        </div>

        {launch.description && <p className={cn('mt-5 text-[16px] leading-relaxed text-muted-foreground', eligibilityNote && 'line-clamp-3')}>{launch.description}</p>}

        {content.links && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {content.links.map((link) => {
              const { name, Icon } = linkKinds[link.kind]
              return (
                <li key={link.kind}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${launch.name} ${name}`}
                    className="grid size-10 place-items-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none"
                  >
                    <Icon className="size-[17px]" />
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-divider px-6 py-6 sm:px-7">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Your eligibility</h2>
        {eligibilityNote ? <div className="mt-4">
          <Eligibility state={launch.eligibility.state} className="text-[17px] [&>svg]:size-[18px]">{launch.eligibility.label}</Eligibility>
        </div> : <dl className="mt-4">
          <dt className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Requirement</dt>
          <dd className="mt-2 text-[17px] font-medium">{launch.requirement}</dd>
          <dt className="mt-5 text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Standing</dt>
          <dd className="mt-2">
            <Eligibility state={launch.eligibility.state} className="text-[17px] [&>svg]:size-[18px]">
              {launch.eligibility.label}
            </Eligibility>
          </dd>
        </dl>}
        <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
          {eligibilityNote ?? (action ? 'Eligibility evaluation is unavailable for this launch.' : 'Reference data for this testnet preview. Eligibility, project links and transactions are not connected.')}
        </p>
        {action ?? <Button
          size="lg"
          className="mt-6 h-[52px] w-full text-[16px]"
          render={<Link href={`/launch/${launch.slug}/participate`} />}
          nativeButton={false}
        >
          {live ? 'Review participation' : 'View participation terms'}
          <ArrowRight data-icon="inline-end" />
        </Button>}
      </div>
    </section>
  )
}
