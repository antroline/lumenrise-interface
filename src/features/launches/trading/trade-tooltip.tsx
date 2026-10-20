'use client';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
export function TradeTooltip({
  children,
  content,
}: {
  children: ReactElement;
  content: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={children}
        delay={250}
        aria-describedby={open ? id : undefined}
      />
      <TooltipContent
        id={id}
        role="tooltip"
        className="max-w-[min(20rem,calc(100vw-2rem))] break-words rounded-xl leading-relaxed"
      >
        <span className="min-w-0 [overflow-wrap:anywhere]">{content}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Text help stays on the text itself and is also reachable by keyboard. */
export function TradeTooltipText({
  children,
  content,
  className,
}: {
  children: ReactNode;
  content?: ReactNode;
  className?: string;
}) {
  if (!content) return <span className={className}>{children}</span>;
  return (
    <TradeTooltip content={content}>
      <span
        tabIndex={0}
        className={cn(
          'cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          className,
        )}
      >
        {children}
      </span>
    </TradeTooltip>
  );
}
