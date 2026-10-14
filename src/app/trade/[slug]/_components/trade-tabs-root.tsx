'use client';
import { useId, useState, type ComponentProps } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { TabState } from './trade-tab-state';

export function TradeTabs({
  children,
  value,
  defaultValue = 'buy',
  onValueChange,
  ...props
}: ComponentProps<typeof Tabs>) {
  const [local, setLocal] = useState(defaultValue);
  const active = String(value ?? local);
  const indicator = useId();
  return (
    <TabState value={{ active, indicator, line: false }}>
      <Tabs
        {...props}
        value={active}
        onValueChange={(next, event) => {
          if (next !== null) setLocal(next);
          onValueChange?.(next, event);
        }}
      >
        {children}
      </Tabs>
    </TabState>
  );
}
