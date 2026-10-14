'use client';
import { useSyncExternalStore, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { ReducedMotion, reducedMotionQuery } from './trade-reduced-motion';
import { subscribeTradeMotion } from './subscribe-trade-motion';
import { tradeTransition } from './trade-transition';
export { tradeTransition } from './trade-transition';
export { useTradeReducedMotion } from './use-trade-reduced-motion';
export { TradeMenuContent } from './trade-menu-content';
export function TradeMotion({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(
    subscribeTradeMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
  return (
    <ReducedMotion value={reduced}>
      <MotionConfig reducedMotion="user" transition={tradeTransition}>
        {children}
      </MotionConfig>
    </ReducedMotion>
  );
}
