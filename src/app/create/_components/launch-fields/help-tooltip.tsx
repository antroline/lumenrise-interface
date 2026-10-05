'use client';

import { CircleHelp } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function HelpTooltip({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const triggerClassName =
    'size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={`${label}: ${children}`}
          className={cn(
            triggerClassName,
            'hidden cursor-help [@media(hover:hover)]:inline-flex',
          )}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="max-w-64 text-left leading-relaxed duration-200 ease-out data-closed:duration-150 motion-reduce:animate-none"
        >
          {children}
        </TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`More about ${label}`}
              className={cn(
                triggerClassName,
                'inline-flex [@media(hover:hover)]:hidden',
              )}
            />
          }
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="max-w-64 p-3 text-small leading-relaxed">
          <PopoverTitle className="sr-only">{label}</PopoverTitle>
          {children}
        </PopoverContent>
      </Popover>
    </>
  );
}
