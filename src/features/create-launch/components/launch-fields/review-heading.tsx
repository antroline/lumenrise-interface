'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReviewHeading({
  id,
  title,
  actions,
}: {
  id: string;
  title: string;
  actions: { label: string; onClick: () => void }[];
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-b border-divider pb-2.5">
      <h3 id={id} className="text-[17px] font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            size="xs"
            onClick={action.onClick}
            aria-label={action.label}
          >
            <Pencil data-icon="inline-start" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
