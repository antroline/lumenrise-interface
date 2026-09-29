import { ChevronDown } from 'lucide-react'
import type { LaunchContent } from '../_data/launch-content'

export function LaunchExtraSections({ content }: { content: LaunchContent }) {
  return (
    <div className="space-y-10 sm:space-y-12">
      {(content.overview || content.team) && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-12">
          {content.overview && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-[23px] font-semibold tracking-[-0.025em]">About the project</h2>
              <p className="mt-4 max-w-[70ch] text-[15px] leading-7 text-muted-foreground">{content.overview}</p>
              {content.facts && (
                <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-ui">
                  {content.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="text-small text-muted-foreground">{fact.label}</dt>
                      <dd className="mt-1 font-semibold">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}

          {content.team && (
            <section className="rounded-2xl bg-muted p-5 sm:p-6" aria-labelledby="team-heading">
              <h2 id="team-heading" className="text-[18px] font-semibold tracking-[-0.02em]">Team</h2>
              <ul className="mt-4 space-y-4">
                {content.team.map((person) => (
                  <li key={person.name} className="text-ui">
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-small text-muted-foreground">{person.role}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {content.tokenomics && (
        <section aria-labelledby="tokenomics-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
            <h2 id="tokenomics-heading" className="text-[23px] font-semibold tracking-[-0.025em]">Tokenomics</h2>
            <p className="text-small text-muted-foreground">{content.tokenomics.totalSupply} total · {content.tokenomics.forSale} for sale</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[590px] border-collapse text-left text-ui">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Allocation</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Share</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th scope="col" className="px-5 py-3 font-medium">Unlock</th>
                </tr>
              </thead>
              <tbody>
                {content.tokenomics.allocations.map((allocation) => (
                  <tr key={allocation.name} className="border-t border-divider">
                    <th scope="row" className="px-5 py-3.5 font-medium">{allocation.name}</th>
                    <td className="px-4 py-3.5 text-right tabular-nums">{allocation.share}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{allocation.tokens}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{allocation.unlock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(content.evidence || content.updates) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {content.evidence && (
            <details className="group rounded-2xl border border-border bg-card px-5 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-semibold marker:hidden focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-orange [&::-webkit-details-marker]:hidden">
                Evidence <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-1 text-small text-muted-foreground">Reference records and project-provided information</p>
              <ul className="mt-4 space-y-4 border-t border-divider pt-4">
                {content.evidence.map((item) => (
                  <li key={item.label} className="text-ui">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-small text-muted-foreground">{item.source === 'verified' ? 'Reference' : 'Project-provided'}</span>
                    </div>
                    <p className="mt-0.5 text-small text-muted-foreground">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {content.updates && (
            <details className="group rounded-2xl border border-border bg-card px-5 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-semibold marker:hidden focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-orange [&::-webkit-details-marker]:hidden">
                Updates <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-1 text-small text-muted-foreground">Project announcements in this preview</p>
              <ul className="mt-4 space-y-4 border-t border-divider pt-4">
                {content.updates.map((update) => (
                  <li key={update.title} className="text-ui">
                    <p className="font-semibold">{update.title}</p>
                    <p className="mt-0.5 text-small text-muted-foreground">{update.detail}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
