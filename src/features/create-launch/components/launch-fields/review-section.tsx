import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ReviewHeading } from './review-heading';

export function ReviewSection({
  title,
  rows = [],
  actions,
  extra,
  className,
}: {
  title: string;
  rows?: [string, ReactNode][];
  actions: { label: string; onClick: () => void }[];
  extra?: ReactNode;
  className?: string;
}) {
  const id = `review-${title.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={cn('min-w-0', className)}>
      <ReviewHeading id={id} title={title} actions={actions} />
      {rows.length > 0 && (
        <dl className="flex flex-col pt-1">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-0.5 border-b border-divider/70 py-2.5 text-ui last:border-b-0 short:py-2"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="ml-auto min-w-0 break-words text-right font-medium">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {extra}
    </section>
  );
}
