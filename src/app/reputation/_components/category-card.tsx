import type { ComponentType, SVGProps } from 'react'
import { Check, Code, Fingerprint, Plus, Users, Vote, Wallet } from 'lucide-react'
import { StellarIcon } from '@/components/brand-icons'
import { SourceLabel } from '@/components/status'
import { SignalNode } from '@/components/visual-system'
import { cn } from '@/lib/utils'
import type { CategoryIcon, ReputationCategory } from '../_data'

const icons: Record<CategoryIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  stellar: StellarIcon,
  code: Code,
  users: Users,
  vote: Vote,
  wallet: Wallet,
  fingerprint: Fingerprint,
}

export function CategoryCard({ category }: { category: ReputationCategory }) {
  const Icon = icons[category.icon]

  return (
    <article className="grid gap-4 border-b border-divider py-5 last:border-b-0 lg:grid-cols-[minmax(150px,0.8fr)_90px_minmax(220px,1.5fr)_minmax(190px,0.8fr)] lg:items-start lg:gap-6">
      <div className="flex items-start gap-3">
        <SignalNode active={category.value >= 70} className="mt-1.5" />
        <div><h3 className="flex items-center gap-2 text-[15px] font-semibold"><Icon className="size-4" aria-hidden="true" />{category.key}</h3><span className="mt-1 block font-mono text-2xs text-muted-foreground uppercase">{category.level}</span></div>
      </div>
      <div className="flex items-baseline gap-1.5 lg:block"><span className="text-big font-semibold tracking-[-0.03em] tabular-nums">{category.value}</span><span className="text-small text-muted-foreground">/ 100{category.sybil ? ' risk' : ''}</span><div className="mt-2 hidden h-1 bg-secondary lg:block"><div className={cn('h-full', category.sybil ? 'bg-ok' : 'bg-foreground')} style={{ width: `${category.value}%` }} /></div></div>
      <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {category.items.map((item) => <div key={item.text} className={cn('flex items-start gap-2 text-ui', !item.done && 'text-muted-foreground')}>
          {item.done ? <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ok" /> : <Plus aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" />}
          {item.text}
        </div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start">
        <SourceLabel verified={!category.inferred} icon={category.inferred ? undefined : Check}>{category.inferred ? 'Inferred' : 'Verified'} · {category.source}</SourceLabel>
        <SourceLabel>{category.updated}</SourceLabel>
      </div>
    </article>
  )
}
