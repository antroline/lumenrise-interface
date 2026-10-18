'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TradeMotion } from './trade-motion';

export function TradePageTemplate({
  header,
  market,
  swap,
  footer,
}: {
  header: ReactNode;
  market: ReactNode;
  swap: ReactNode;
  footer: ReactNode;
}) {
  return (
    <TooltipProvider delay={350}>
      <TradeMotion>
        <motion.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          className="relative isolate mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-6 [--muted:var(--secondary)] [--secondary:color-mix(in_srgb,var(--surface)_85%,var(--surface-divider))] [&_th]:border-0 [&_td]:border-0 [&_tr]:border-0 [&_thead]:border-0 [&_button:not([data-slot=select-trigger])]:border-0 [&_[data-slot=card-footer]]:border-0"
        >
          <div className="flex min-w-0 flex-col gap-4">{header}</div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_368px] xl:gap-7">
            <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
              <div id="price-history" className="min-w-0 scroll-mt-24">
                {market}
              </div>
              {footer}
            </div>
            <aside
              aria-label="Trading panel"
              className="order-1 min-w-0 self-start lg:sticky lg:top-21 lg:order-2 lg:max-h-[calc(100svh-104px)] lg:overflow-y-auto [scrollbar-width:thin]"
            >
              {swap}
            </aside>
          </div>
        </motion.div>
      </TradeMotion>
    </TooltipProvider>
  );
}
