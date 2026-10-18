'use client';
import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReducedMotion } from './trade-reduced-motion';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion';
import { tradeTransition } from './trade-transition';
export function TradeMotion({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPreference();
  return (
    <ReducedMotion value={reduced}>
      <MotionConfig reducedMotion="user" transition={tradeTransition}>
        <TooltipProvider delay={350}>{children}</TooltipProvider>
      </MotionConfig>
    </ReducedMotion>
  );
}
