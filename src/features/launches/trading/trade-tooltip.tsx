'use client';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
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
        aria-describedby={open ? id : undefined}
      />
      <TooltipContent
        id={id}
        role="tooltip"
        className="rounded-xl leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
