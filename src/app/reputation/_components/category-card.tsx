import type { ComponentType, SVGProps } from 'react'
import { Check, Code, Fingerprint, Plus, Users, Vote, Wallet } from 'lucide-react'
import { StellarIcon } from '@/components/brand-icons'
import { IconTile } from '@/components/icon-tile'
import { Label } from '@/components/stat'
import { SourceLabel } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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

function levelVariant(category: ReputationCategory) {
  if (category.sybil) return 'ok' as const
  if (category.value >= 70) return 'default' as const
  if (category.value >= 50) return 'soft' as const
  return 'warn' as const
}

export function CategoryCard({ category }: { category: ReputationCategory }) {
  const Icon = icons[category.icon]

  return (
    <Card className="gap-4 p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconTile>
            <Icon />
          </IconTile>
          <b className="text-[15px] font-semibold">{category.key}</b>
        </div>
        <Badge size="sm" variant={levelVariant(category)}>
          {category.level}
        </Badge>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-big font-semibold tracking-[-0.03em] tabular-nums">{category.value}</span>
        <span className="text-small text-muted-foreground">/ 100{category.sybil ? ' risk' : ''}</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full', category.sybil ? 'bg-ok' : 'bg-emphasis')}
          style={{ width: `${category.value}%` }}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-divider pt-3.5">
        <Label>What counts</Label>
        {category.items.map((item) => (
          <div key={item.text} className={cn('flex items-center gap-2 text-ui', !item.done && 'text-muted-foreground')}>
            {item.done ? (
              <Check aria-hidden="true" className="size-[15px] shrink-0 text-ok" />
            ) : (
              <Plus aria-hidden="true" className="size-[15px] shrink-0 text-faint" />
            )}
            {item.text}
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-3">
        <SourceLabel verified={!category.inferred} icon={category.inferred ? undefined : Check}>
          {category.inferred ? 'Inferred' : 'Verified'} · {category.source}
        </SourceLabel>
        <SourceLabel>{category.updated}</SourceLabel>
      </div>
    </Card>
  )
}
