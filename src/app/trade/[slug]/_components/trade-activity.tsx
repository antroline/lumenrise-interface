'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  TradeTabs,
  TradeTabsList,
  TradeTabsTrigger,
  TradeTabsContent,
  TradeTabPanels,
} from './trade-tabs';

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
  const [active, setActive] = useState('trades');
  useEffect(() => {
    const followHash = () => {
      if (window.location.hash === '#pools') {
        setActive('pools');
        onHoldersActiveChange?.(false);
      }
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [onHoldersActiveChange]);
  useEffect(() => {
    if (active !== 'pools' || window.location.hash !== '#pools') return;
    const frame = requestAnimationFrame(() =>
      document.getElementById('pools')?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [active]);
  const unavailable = (title: string, reason: string) => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{reason}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
  return (
    <section aria-labelledby="activity-heading" className="min-w-0">
      <h2 id="activity-heading" className="sr-only">
        Market activity
      </h2>
      <TradeTabs
        value={active}
        onValueChange={(value) => {
          if (value !== null) {
            setActive(String(value));
            onHoldersActiveChange?.(value === 'holders');
          }
        }}
      >
        <TradeTabsList
          variant="line"
          aria-label="Market activity"
          className="max-w-full flex-wrap gap-x-5 gap-y-0"
        >
          <TradeTabsTrigger value="trades">Activity</TradeTabsTrigger>
          <TradeTabsTrigger value="holders">Holders</TradeTabsTrigger>
          <TradeTabsTrigger value="leaders">Top traders</TradeTabsTrigger>
          <TradeTabsTrigger value="pools">Liquidity pools</TradeTabsTrigger>
        </TradeTabsList>
        <TradeTabPanels>
          <TradeTabsContent value="trades">{trades}</TradeTabsContent>
          <TradeTabsContent value="holders">
            {holders ?? unavailable(
              'Holder data unavailable',
              'Holder balances are not indexed. Distinct buyers are not a holder count.',
            )}
          </TradeTabsContent>
          <TradeTabsContent value="leaders">
            {unavailable(
              'Top trader data unavailable',
              'A complete trader ranking is not connected.',
            )}
          </TradeTabsContent>
          <TradeTabsContent value="pools">
            <div id="pools" className="scroll-mt-24">
              {pools}
            </div>
          </TradeTabsContent>
        </TradeTabPanels>
      </TradeTabs>
    </section>
  );
}
