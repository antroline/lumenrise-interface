'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Ellipsis, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { TradeMenuContent } from './trade-menu-content';
import { TradeCopyFeedback } from './trade-copy-feedback';
import { TradeTooltip } from './trade-tooltip';
export function TradeHeaderActions({
  address,
  overview,
  actions,
  copy,
  copyMessage,
}: {
  address?: string;
  overview?: string;
  actions?: ReactNode;
  copy: (value: string, label: string) => Promise<void>;
  copyMessage?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="relative inline-flex">
        <TradeTooltip content="Copy token page link">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy token page link"
            onClick={() => void copy(window.location.href, 'Link')}
          >
            <Share2 className="size-4" />
          </Button>
        </TradeTooltip>
        <TradeCopyFeedback message={copyMessage} align="end" />
      </span>
      <DropdownMenu>
        <TradeTooltip content="Token options">
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Token options" />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
        </TradeTooltip>
        <TradeMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            {overview && (
              <DropdownMenuItem render={<Link href={overview} />}>
                Project overview
              </DropdownMenuItem>
            )}
            {address && (
              <DropdownMenuItem onClick={() => void copy(address, 'Address')}>
                Copy contract address
              </DropdownMenuItem>
            )}
            {actions && <div className="p-1">{actions}</div>}
          </DropdownMenuGroup>
        </TradeMenuContent>
      </DropdownMenu>
    </div>
  );
}
