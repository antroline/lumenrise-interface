'use client';
import { useContext, type ComponentProps } from 'react';
import { motion } from 'motion/react';
import { useTradePanelAnimation } from './use-trade-panel-animation';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TabState } from './trade-tab-state';

export function TradeTabsContent({
  className,
  value,
  children,
  ...props
}: ComponentProps<typeof TabsContent>) {
  const { active } = useContext(TabState);
  const reduced = useTradeReducedMotion();
  const selected = active === String(value);
  const animation = useTradePanelAnimation(selected, String(value), reduced);
  return (
    <TabsContent
      {...props}
      keepMounted
      value={value}
      data-trade-active={selected}
      className={cn(
        'min-w-0',
        !selected && 'absolute inset-x-0 top-0 pointer-events-none',
        className,
      )}
    >
      <motion.div initial={false} animate={animation}>
        {children}
      </motion.div>
    </TabsContent>
  );
}
