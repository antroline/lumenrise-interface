'use client';

import Image from 'next/image';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function MethodCard({
  icon: Icon,
  title,
  detail,
  illustration,
  badge,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  illustration: string;
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
        'group flex min-h-48 min-w-0 flex-col items-start rounded-2xl border bg-card p-4 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none motion-reduce:transform-none short:min-h-44 short:p-3',
        selected ? 'border-foreground' : 'border-border',
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <Badge variant={badge === 'Live on testnet' ? 'ok' : 'soft'}>
          {badge}
        </Badge>
      </div>
      <strong className="mt-3 text-[17px] font-semibold leading-6 short:mt-2">{title}</strong>
      <span className="mt-1 text-ui text-muted-foreground">{detail}</span>
      <span className="mt-auto flex w-full items-end justify-between gap-3 pt-3 short:pt-1.5">
        <span className="text-ui font-semibold group-hover:underline">
          Select method{' '}
          <ArrowRight className="inline size-4" aria-hidden="true" />
        </span>
        <Image
          src={illustration}
          alt=""
          width={1254}
          height={1254}
          sizes="(max-height: 800px) 48px, 80px"
          draggable={false}
          className="pointer-events-none size-20 shrink-0 object-contain select-none short:size-12"
        />
      </span>
    </button>
  );
}
