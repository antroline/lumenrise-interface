import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoordinateField, EvidenceLedger, InsetField, SignalTopology, Trajectory } from '@/components/visual-system'

type Specimen = 'campaigns' | 'developers' | 'cli'

function TechnicalSpecimen({ kind }: { kind: Specimen }) {
  if (kind === 'campaigns') {
    return <InsetField className="relative z-10"><span className="caps mb-4 block">Campaign signal path</span><SignalTopology sources={['Participation', 'Referral', 'Contribution']} outcome="Project credential" /></InsetField>
  }
  if (kind === 'developers') {
    return <InsetField className="relative z-10"><span className="caps mb-4 block">Eligibility interface</span><EvidenceLedger rows={[{ label: 'Profile query', source: 'INPUT' }, { label: 'Launch policy', source: 'RULE' }, { label: 'Eligibility result', source: 'OUTPUT', active: true }]} /></InsetField>
  }
  return <InsetField className="relative z-10"><span className="caps mb-4 block">Launch configuration</span><code className="block border-y border-divider py-4 font-mono text-small">&gt; lumenrise launch create</code><div className="mt-5"><Trajectory label="Planned CLI workflow" active={0} steps={[{ label: 'Configure' }, { label: 'Review' }, { label: 'Deploy' }]} /></div></InsetField>
}

export function ComingSoon({
  icon: Icon,
  title,
  description,
  kind,
}: {
  icon: LucideIcon
  title: string
  description: string
  kind: Specimen
}) {
  return (
    <section className="relative isolate grid min-h-[60vh] items-center gap-10 overflow-hidden border-y border-divider py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
      <CoordinateField className="top-[45%] opacity-65 lg:top-0 lg:left-[42%]" />
      <div className="relative z-10 max-w-xl">
        <span className="mb-6 flex items-center gap-3 font-mono text-2xs tracking-caps text-muted-foreground uppercase"><Icon className="size-4 text-foreground" aria-hidden="true" />Planned surface</span>
        <h1 className="text-[36px] leading-[1.04] font-bold tracking-[-0.04em] sm:text-h1">{title}</h1>
        <p className="mt-5 max-w-[55ch] text-base leading-relaxed text-muted-foreground">{description}</p>
        <Button variant="dark" className="mt-8" render={<Link href="/" />} nativeButton={false}>Explore launches<ArrowRight data-icon="inline-end" /></Button>
      </div>
      <TechnicalSpecimen kind={kind} />
    </section>
  )
}
