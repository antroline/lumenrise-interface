'use client';

import { useId, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const accordionTransition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1] as const,
};

export type AccordionProps = {
  title: ReactNode;
  description?: string;
  compact?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'surface' | 'plain' | 'inset' | 'soft' | 'attached';
  className?: string;
  children: ReactNode;
};

export function Accordion({
  title,
  description,
  compact = true,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  variant = 'surface',
  children,
}: AccordionProps) {
  const [localOpen, setOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const id = useId();
  const reduced = useReducedMotion();
  const framed = variant === 'inset' || variant === 'soft';
  return (
    <div
      data-slot="accordion"
      data-variant={variant}
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'min-w-0',
        framed &&
          'rounded-3xl border border-border bg-card p-2.5 text-card-foreground',
        variant === 'soft' && 'accordion-soft',
        variant === 'attached' &&
          'rounded-b-2xl border border-t-0 border-border bg-secondary/60 px-4 pt-3 pb-1',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (controlledOpen === undefined) setOpen(!open);
          onOpenChange?.(!open);
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60',
          compact ? 'min-h-11 py-2' : 'min-h-14 py-3',
          variant === 'surface' &&
            'border border-border bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--foreground)_4%,transparent)_0_1px,transparent_1px_7px)] px-5 hover:border-foreground/25 transition-colors motion-reduce:transition-none',
          framed && 'px-3 transition-colors motion-reduce:transition-none',
          variant === 'inset' && 'hover:bg-secondary/50',
          variant === 'soft' && 'bg-card hover:bg-(--accordion-header-hover)',
          variant === 'attached' && 'rounded-lg',
        )}
      >
        <span className="min-w-0">
          <span
            className={cn(
              'block font-medium',
              compact ? 'text-small' : 'text-title',
              variant === 'surface' &&
                'text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-[22px]',
              framed &&
                'text-base font-semibold tracking-tight text-foreground sm:text-lg',
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
          className="shrink-0"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ ...accordionTransition, duration: reduced ? 0 : 0.2 }}
        >
          <ChevronDown
            aria-hidden="true"
            className={
              variant === 'plain' || variant === 'attached'
                ? 'size-4'
                : 'size-5 text-foreground'
            }
          />
        </motion.span>
      </button>
      <motion.div
        data-slot="accordion-content"
        id={id}
        inert={!open}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ ...accordionTransition, duration: reduced ? 0 : 0.24 }}
        className="overflow-hidden"
      >
        <div
          className={
            variant === 'surface'
              ? 'px-0.5 pt-2 pb-1'
              : framed
                ? 'pt-2'
                : undefined
          }
        >
          <div
            data-slot="accordion-body"
            className={cn(
              'flex min-w-0 flex-col gap-3',
              variant === 'surface'
                ? 'rounded-2xl bg-secondary/50 p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
                : framed
                  ? 'rounded-2xl bg-soft-inset p-4 sm:p-5'
                  : 'py-2',
            )}
          >
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
