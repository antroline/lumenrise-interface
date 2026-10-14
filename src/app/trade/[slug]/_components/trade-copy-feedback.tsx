'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
import { tradeTransition } from './trade-transition';
export function TradeCopyFeedback({
  message,
  align = 'start',
}: {
  message?: string;
  align?: 'start' | 'end';
}) {
  const reduced = useTradeReducedMotion();
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={
        align === 'end'
          ? 'pointer-events-none absolute top-full right-0 z-10 mt-1'
          : 'pointer-events-none inline-flex min-w-0'
      }
    >
      <AnimatePresence>
        {message && (
          <motion.span
            key={message}
            initial={reduced ? false : { width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ ...tradeTransition, duration: reduced ? 0 : 0.18 }}
            className="inline-flex overflow-hidden"
          >
            <span
              className={
                align === 'end'
                  ? 'block w-max max-w-56 rounded-xl border border-border bg-popover px-2.5 py-1.5 text-small font-medium text-popover-foreground shadow-sm'
                  : 'ml-2 block w-max max-w-56 rounded-lg bg-muted px-2 py-1 text-small font-medium text-foreground'
              }
            >
              {message}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
