'use client';

import { useId, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tradeTransition } from './trade-transition';
import { useTradeReducedMotion } from './use-trade-reduced-motion';

export function TradeDisclosure({
  title,
  description,
  compact = true,
  className,
  children,
}: {
  title: ReactNode;
  description?: string;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduced = useTradeReducedMotion();
  return (
    <div className={cn('min-w-0', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60',
          compact ? 'min-h-11 py-2' : 'min-h-14 py-3',
        )}
      >
        <span>
          <span
            className={cn(
              'block font-medium',
              compact ? 'text-small' : 'text-title',
            )}
          >
            {title}
          </span>
          {description && (
            <span className="mt-1 block text-small text-muted-foreground">
              {description}
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ ...tradeTransition, duration: reduced ? 0 : 0.2 }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <motion.div
        id={id}
        inert={!open}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ ...tradeTransition, duration: reduced ? 0 : 0.24 }}
        className="overflow-hidden"
      >
        <div className="flex min-w-0 flex-col gap-3 pt-2 pb-2">{children}</div>
      </motion.div>
    </div>
  );
}
