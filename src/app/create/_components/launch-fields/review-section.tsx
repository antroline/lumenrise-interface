import type { ReactNode } from 'react';
import { ReviewHeading } from './review-heading';

export function ReviewSection({
  title,
  rows,
  actions,
  extra,
}: {
  title: string;
  rows: [string, ReactNode][];
  actions: { label: string; onClick: () => void }[];
  extra?: ReactNode;
}) {
  const id = `review-${title.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id}>
      <ReviewHeading id={id} title={title} actions={actions} />
      <dl className="grid gap-3 pt-4 short:gap-2 short:pt-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid min-w-0 gap-1 text-ui sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-6"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words font-medium sm:text-right">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {extra}
    </section>
  );
}
