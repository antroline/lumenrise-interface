'use client';
import type { ComponentProps } from 'react';
import { motion } from 'motion/react';
import { DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { tradeTransition } from './trade-transition';
import { useTradeReducedMotion } from './use-trade-reduced-motion';
export function TradeMenuContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuContent>) {
  const reduced = useTradeReducedMotion();
  return (
    <DropdownMenuContent
      {...props}
      className={cn('rounded-2xl ring-0 animate-none!', className)}
      render={(attributes, state) => {
        // React's drag and animation event types conflict with motion's own handler types.
        const {
          onDrag: _onDrag,
          onDragStart: _onDragStart,
          onDragEnd: _onDragEnd,
          onDragEnter: _onDragEnter,
          onDragLeave: _onDragLeave,
          onDragOver: _onDragOver,
          onDrop: _onDrop,
          onAnimationStart: _onAnimationStart,
          onAnimationEnd: _onAnimationEnd,
          onAnimationIteration: _onAnimationIteration,
          onTransitionEnd: _onTransitionEnd,
          ...rest
        } = attributes;
        return (
          <motion.div
            {...rest}
            initial={reduced ? false : { opacity: 0, scale: 0.98 }}
            animate={{
              opacity: state.open ? 1 : 0,
              scale: state.open || reduced ? 1 : 0.98,
            }}
            transition={{ ...tradeTransition, duration: reduced ? 0 : 0.18 }}
          />
        );
      }}
    />
  );
}
