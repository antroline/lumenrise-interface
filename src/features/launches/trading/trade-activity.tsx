'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { UsersRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { tradeTransition } from './trade-transition';

export function TradeActivity({
  trades,
  pools,
  holders,
  onHoldersActiveChange,
  className,
}: {
  trades: ReactNode;
  pools: ReactNode;
  holders?: ReactNode;
  onHoldersActiveChange?: (active: boolean) => void;
  className?: string;
}) {
  const headingId = useId();
  const reducedMotion = useReducedMotionPreference();
  const [activeTab, setActiveTab] = useState('trades');

  useEffect(() => {
    const followHash = () => {
      if (window.location.hash === '#pools') setActiveTab('pools');
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);

  useEffect(() => {
    onHoldersActiveChange?.(activeTab === 'holders');
  }, [activeTab, onHoldersActiveChange]);

  useEffect(() => {
    if (activeTab !== 'pools' || window.location.hash !== '#pools') return;
    const frame = requestAnimationFrame(() =>
      document.getElementById('pools')?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const sections = [
    { key: 'trades', title: 'Recent Trades', content: trades },
    {
      key: 'holders',
      title: 'Holders',
      content: holders ?? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <UsersRound aria-hidden="true" className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Holder data unavailable</EmptyTitle>
            <EmptyDescription>
              Holder balances are not indexed. Distinct buyers are not a holder
              count.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ),
    },
    { key: 'pools', title: 'Liquidity Pools', content: pools },
  ] as const;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'min-w-0 rounded-2xl bg-card p-4 text-card-foreground sm:p-5 [&_[data-slot=empty]]:gap-3 [&_[data-slot=empty]]:rounded-none [&_[data-slot=empty]]:border-0 [&_[data-slot=empty]]:px-2 [&_[data-slot=empty]]:py-8 [&_[data-slot=empty-icon]]:mb-1 [&_[data-slot=empty-icon]]:text-muted-foreground [&_[data-slot=empty-title]]:text-sm [&_[data-slot=empty-title]]:font-medium [&_[data-slot=empty-description]]:text-sm',
        className,
      )}
    >
      <h2 id={headingId} className="mb-3 text-lg font-semibold tracking-tight">
        On-chain Activity
      </h2>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (typeof value === 'string') setActiveTab(value);
        }}
        className="min-w-0 gap-4"
      >
        <TabsList
          variant="line"
          aria-label="On-chain activity"
          className="max-w-full justify-start gap-3 border-border sm:gap-6"
        >
          {sections.map(({ key, title }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="min-h-11 px-1 text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-inset data-active:font-semibold group-data-[variant=line]/tabs-list:text-xs sm:group-data-[variant=line]/tabs-list:text-sm group-data-[variant=line]/tabs-list:after:bg-foreground"
            >
              {title}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map(({ key, content }) => (
          <TabsContent
            key={key}
            value={key}
            keepMounted
            className="min-w-0 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
          >
            <motion.div
              id={key === 'pools' ? 'pools' : undefined}
              className="min-w-0 scroll-mt-24"
              initial={false}
              animate={
                activeTab === key && !reducedMotion
                  ? { opacity: [0.65, 1], filter: ['blur(5px)', 'blur(0px)'] }
                  : { opacity: 1, filter: 'blur(0px)' }
              }
              transition={reducedMotion ? { duration: 0 } : tradeTransition}
            >
              {content}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
