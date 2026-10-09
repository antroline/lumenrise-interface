import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { Blockie } from '@/components/blockie'
import { SourceLabel } from '@/components/status'
import { cardVariants } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { EvidenceLedger } from '@/components/visual-system'
import { cn } from '@/lib/utils'
import type { LaunchContent } from '../_data/launch-content'
import { toneFor } from '../_data/allocation-tones'
import { AllocationChart, type AllocationSlice } from './allocation-chart'

const panel = cardVariants({ variant: 'surface', size: 'lg' })

function Section({
  titleId,
  title,
  meta,
  children,
}: {
  titleId: string
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={titleId} className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={titleId} className="text-[22px] font-semibold tracking-[-0.025em] sm:text-[25px]">
          {title}
        </h2>
        {meta && <p className="text-[15px] text-muted-foreground">{meta}</p>}
      </div>
      {children}
    </section>
  )
}

/** Chart keys become CSS custom properties, so they must survive being written as one. */
function sliceKey(name: string, index: number) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `allocation-${index}`
}

/** Shares arrive as display strings; an unparseable one means no chart at all. */
function allocationSlices(tokenomics: NonNullable<LaunchContent['tokenomics']>): AllocationSlice[] | null {
  const slices = tokenomics.allocations.map((allocation, index) => ({
    key: sliceKey(allocation.name, index),
    name: allocation.name,
    share: Number.parseFloat(allocation.share),
  }))
  return slices.every((slice) => Number.isFinite(slice.share) && slice.share > 0) ? slices : null
}

function provenance(source: 'verified' | 'project-provided') {
  const verified = source === 'verified'
  return (
    <SourceLabel verified={verified} className={cn('text-[13px]', !verified && 'text-muted-foreground')}>
      {verified ? 'Verified' : 'Project-provided'}
    </SourceLabel>
  )
}

export function LaunchExtraSections({
  content,
  className,
}: {
  content: LaunchContent
  className?: string
}) {
  const hasDetails = Boolean(
    content.overview || content.evidence || content.team || content.tokenomics || content.updates
  )
  const tokenomics = content.tokenomics
  const slices = tokenomics ? allocationSlices(tokenomics) : null

  return (
    <div className={cn('flex flex-col gap-5 lg:gap-6', className)}>
      {content.overview && (
        <Section titleId="about-heading" title="About the project">
          <p className="max-w-[56ch] text-[17px] leading-[1.7] text-muted-foreground">{content.overview}</p>
          {content.facts && (
            <dl className="flex flex-wrap gap-x-16 gap-y-6 border-t border-divider pt-7">
              {content.facts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {fact.label}
                  </dt>
                  <dd className="mt-2.5 text-[20px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Section>
      )}

      {content.evidence && (
        <Section titleId="evidence-heading" title="Evidence" meta="Verification is evidence, not endorsement">
          <EvidenceLedger
            size="lg"
            className="max-w-[840px]"
            rows={content.evidence.map((item) => ({
              label: item.label,
              detail: item.detail,
              source: provenance(item.source),
              active: item.source === 'verified',
              tone: 'ok' as const,
            }))}
          />
        </Section>
      )}

      {tokenomics && (
        <Section
          titleId="tokenomics-heading"
          title="Tokenomics"
          meta={`${tokenomics.totalSupply} total · ${tokenomics.forSale} for sale`}
        >
          {/* Decorative: the section meta states the split and the table is the record. */}
          <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-center 2xl:gap-10">
            {slices && (
              <div aria-hidden="true" className="mx-auto w-[240px] shrink-0 2xl:mx-0">
                <AllocationChart slices={slices} forSale={tokenomics.forSale} />
              </div>
            )}
            <div
              className="min-w-0 flex-1 overflow-x-auto"
              role="region"
              aria-labelledby="tokenomics-heading"
              tabIndex={0}
            >
              <table className="w-full min-w-[620px] max-w-[840px] border-collapse text-left text-[16px]">
                <thead>
                  <tr className="border-b border-divider">
                    <th scope="col" className="pr-4 pb-3.5 text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Allocation
                    </th>
                    <th scope="col" className="px-4 pb-3.5 text-right text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Share
                    </th>
                    <th scope="col" className="px-4 pb-3.5 text-right text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Tokens
                    </th>
                    <th scope="col" className="pl-4 pb-3.5 text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Unlock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokenomics.allocations.map((allocation, index) => (
                    <tr key={allocation.name} className="border-b border-divider last:border-b-0">
                      <th scope="row" className="py-4 pr-4 font-semibold">
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={cn('size-2.5 shrink-0 rounded-[3px] ring-1 ring-foreground/15', toneFor(index).swatch)}
                          />
                          {allocation.name}
                        </span>
                      </th>
                      <td className="px-4 py-4 text-right tabular-nums">{allocation.share}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{allocation.tokens}</td>
                      <td className="py-4 pl-4 text-muted-foreground">{allocation.unlock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[15px] text-muted-foreground md:hidden">
            Scroll the table sideways for tokens and unlock terms.
          </p>
          {content.unlockSummary && (
            <p className="text-[15px] text-muted-foreground">For sale unlock: {content.unlockSummary}</p>
          )}
        </Section>
      )}

      {content.team && (
        // Each person is their own panel, so the section carries no outer panel of its own.
        <section aria-labelledby="team-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 sm:px-8">
            <h2 id="team-heading" className="text-[22px] font-semibold tracking-[-0.025em] sm:text-[25px]">
              Team
            </h2>
            <p className="text-[15px] text-muted-foreground">Provenance is shown per person</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {content.team.map((person) => (
              <li key={person.name} className={cardVariants({ variant: 'surface' })}>
                <div className="flex items-start gap-4">
                  <Blockie seed={person.name} size={56} radius={14} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-semibold tracking-[-0.015em]">{person.name}</p>
                    <p className="mt-1 text-[15px] text-muted-foreground">{person.role}</p>
                    <div className="mt-3">{provenance(person.source)}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.updates && (
        <Section titleId="updates-heading" title="Updates">
          <ul className="border-t border-divider">
            {content.updates.map((update) => (
              <li key={update.title} className="border-b border-divider py-5 last:border-b-0">
                <p className="text-[17px] font-semibold">{update.title}</p>
                <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">{update.detail}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!hasDetails && (
        <Empty className="bg-surface p-8 sm:p-10">
          <EmptyHeader className="max-w-[52ch] gap-3">
            <EmptyMedia variant="icon" className="size-14">
              <FileText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-[22px] tracking-[-0.025em]">Project details not published yet</EmptyTitle>
            <EmptyDescription className="text-[16px] leading-relaxed">
              This project has not published evidence, tokenomics, team or update records yet. The sale terms,
              requirement and your eligibility are shown in the project panel on this page.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
