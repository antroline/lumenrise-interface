'use client';
import { useContext, type ComponentProps } from 'react';
import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TabState } from './trade-tab-state';

export function TradeTabsList({
  children,
  className,
  variant,
  ...props
}: ComponentProps<typeof TabsList>) {
  const context = useContext(TabState);
  return (
    <TabState value={{ ...context, line: variant === 'line' }}>
      <TabsList
        {...props}
        variant={variant}
        className={cn(
          variant === 'line'
            ? 'gap-5 border-0 overflow-visible'
            : 'relative w-full rounded-full bg-muted p-1',
          className,
        )}
      >
        {children}
      </TabsList>
    </TabState>
  );
}
