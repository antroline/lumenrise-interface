'use client';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { tradeTransition } from './trade-transition';
export function TradeValue({ children }: { children: ReactNode }) {
  const reduced = useTradeReducedMotion();
  return (
    <motion.span
      key={String(children)}
      className="inline-block"
      initial={reduced ? false : { opacity: 0, y: 3, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ ...tradeTransition, duration: reduced ? 0 : 0.18 }}
    >
      {children}
    </motion.span>
  );
}
