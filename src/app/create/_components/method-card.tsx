'use client';

import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MethodCard({
  icon: Icon,
  title,
  detail,
  badge,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  badge: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex min-h-44 flex-col items-start rounded-2xl border bg-card p-5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none motion-reduce:transform-none',
        selected ? 'border-foreground' : 'border-border',
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Badge variant={badge === 'Live on testnet' ? 'ok' : 'soft'}>
          {badge}
        </Badge>
      </div>
      <strong className="mt-5 text-[18px] font-semibold">{title}</strong>
      <span className="mt-1 text-ui text-muted-foreground">{detail}</span>
      <span className="mt-auto pt-4 text-ui font-semibold group-hover:underline">
        Select method{' '}
        <ArrowRight className="inline size-4" aria-hidden="true" />
      </span>
    </button>
  );
}
