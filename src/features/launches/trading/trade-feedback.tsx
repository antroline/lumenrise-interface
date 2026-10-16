'use client';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { tradeTransition } from './trade-transition';
export function TradeFeedback({ children }: { children: ReactNode }) {
  const reduced = useTradeReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          key="feedback"
          initial={reduced ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ ...tradeTransition, duration: reduced ? 0 : 0.18 }}
          className="min-w-0 overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
