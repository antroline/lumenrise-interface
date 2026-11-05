'use client';

import type { ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Compose with the actual control so keyboard focus reveals the same help as hover. */
export function ControlTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactElement;
}) {
  return (
    <Tooltip disabled={!enabled}>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}
