'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { TradeDisclosure } from './trade-disclosure';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { tradeTransition } from './trade-transition';

/** Keep quote state with its form while displaying the disclosure beneath the trading card. */
export function TradeQuoteDetails({
  host,
  visible,
  children,
}: {
  host?: HTMLElement | null;
  visible: boolean;
  children: ReactNode;
}) {
  const reduced = useTradeReducedMotion();
  const content = (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="quote-details"
          initial={{ height: 0, opacity: 0, y: reduced ? 0 : -10 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: reduced ? 0 : -10 }}
          transition={{ ...tradeTransition, duration: reduced ? 0 : 0.22 }}
          className="overflow-hidden"
        >
          <TradeDisclosure title="Quote details" variant="attached">
            {children}
          </TradeDisclosure>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return host ? createPortal(content, host) : content;
}
