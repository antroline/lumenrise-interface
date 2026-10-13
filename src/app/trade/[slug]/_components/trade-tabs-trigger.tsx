'use client';
import { useContext, type ComponentProps } from 'react';
import { motion } from 'motion/react';
import { tradeTransition } from './trade-transition';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TabState } from './trade-tab-state';

export function TradeTabsTrigger({
  children,
  className,
  value,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  const { active, indicator, line } = useContext(TabState);
  const reduced = useTradeReducedMotion();
  return (
    <TabsTrigger
      {...props}
      value={value}
      className={cn(
        'relative min-h-11 after:hidden data-active:bg-transparent data-active:shadow-none dark:data-active:bg-transparent',
        line
          ? 'text-title! font-semibold! pb-2!'
          : 'flex-1 rounded-full! text-lg! font-bold!',
        className,
      )}
    >
      {!line && active === String(value) && (
        <motion.span
          layoutId={indicator}
          className="absolute inset-0 rounded-full bg-background dark:bg-card"
          transition={{ ...tradeTransition, duration: reduced ? 0 : 0.24 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsTrigger>
  );
}
