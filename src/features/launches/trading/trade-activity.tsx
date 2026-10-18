'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Accordion } from '@/components/ui/accordion';

export function TradeActivity({
  trades,
  pools,
  holders,
  onHoldersActiveChange,
}: {
  trades: ReactNode;
  pools: ReactNode;
  holders?: ReactNode;
  onHoldersActiveChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState({
    trades: true,
    holders: false,
    pools: false,
  });
  useEffect(() => {
    const followHash = () => {
      if (window.location.hash === '#pools')
        setOpen((current) => ({ ...current, pools: true }));
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);
  useEffect(() => {
    if (!open.pools || window.location.hash !== '#pools') return;
    const frame = requestAnimationFrame(() =>
      document.getElementById('pools')?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [open.pools]);
  const sections = [
    { key: 'trades', title: 'Recent trades', content: trades },
    {
      key: 'holders',
      title: 'Holders',
      content: holders ?? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Holder data unavailable</EmptyTitle>
            <EmptyDescription>
              Holder balances are not indexed. Distinct buyers are not a holder
              count.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ),
    },
    { key: 'pools', title: 'Liquidity pools', content: pools },
  ] as const;
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
      {sections.map(({ key, title, content }) => (
        <section
          key={key}
          id={key === 'pools' ? 'pools' : undefined}
          aria-label={title}
          className="min-w-0 scroll-mt-24"
        >
          <Accordion
            title={title}
            open={open[key]}
            onOpenChange={(expanded) => {
              setOpen((current) => ({ ...current, [key]: expanded }));
              if (key === 'holders') onHoldersActiveChange?.(expanded);
            }}
          >
            {content}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
