'use client';
import {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import { tradeTransition } from './trade-transition';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { cn } from '@/lib/utils';
import { TabState } from './trade-tab-state';

export function TradeTabPanels({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { active } = useContext(TabState);
  const frame = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const reduced = useTradeReducedMotion();
  useLayoutEffect(() => {
    const panel = frame.current?.querySelector<HTMLElement>(
      '[data-trade-active="true"]',
    );
    if (!panel) return;
    const measure = () => {
      const next = panel.getBoundingClientRect().height;
      if (next > 0) setHeight(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [active]);
  return (
    <motion.div
      ref={frame}
      initial={false}
      animate={{ height: height ?? 'auto' }}
      transition={{ ...tradeTransition, duration: reduced ? 0 : 0.24 }}
      className={cn('relative min-w-0 overflow-hidden', className)}
    >
      {children}
    </motion.div>
  );
}
