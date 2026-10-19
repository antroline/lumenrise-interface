'use client';

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWideLayout } from '../hooks/use-scrolled-past';
import { LaunchPanel } from './launch-panel';

export type TradeFormRenderer = (
  host: HTMLElement | null,
  active: boolean,
) => ReactNode;

/** Keep both directions mounted when switching tabs or closing the mobile sheet. */
export function LaunchActionCard({
  identity,
  name,
  buy,
  sell,
  trade,
  walletFeedback,
  loading,
}: {
  identity: ReactNode;
  name: string;
  buy?: TradeFormRenderer | null;
  sell?: TradeFormRenderer | null;
  trade?: ReactNode;
  walletFeedback?: ReactNode;
  loading: boolean;
}) {
  const wide = useWideLayout();
  const [open, setOpen] = useState(false);
  const [quoteHost, setQuoteHost] = useState<HTMLDivElement | null>(null);
  const [direction, setDirection] = useState('buy');
  const form = (
    <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
      {trade ??
        (buy || sell ? (
          <Tabs
            value={direction}
            onValueChange={(value) => {
              if (value === 'buy' || value === 'sell') setDirection(value);
            }}
            className="relative gap-3"
          >
            <TabsList aria-label="Trade direction" className="h-8 w-fit">
              <TabsTrigger
                value="buy"
                className="px-3! text-xs! data-active:bg-neutral-900! data-active:text-white! dark:data-active:bg-neutral-700!"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="px-3! text-xs! data-active:bg-neutral-900! data-active:text-white! dark:data-active:bg-neutral-700!"
              >
                Sell
              </TabsTrigger>
            </TabsList>
            <TabsContent value="buy" keepMounted>
              {buy?.(quoteHost, direction === 'buy')}
            </TabsContent>
            <TabsContent value="sell" keepMounted>
              {sell?.(quoteHost, direction === 'sell')}
            </TabsContent>
          </Tabs>
        ) : loading ? (
          <div
            role="status"
            aria-label="Loading trading configuration"
            aria-busy="true"
            className="flex flex-col gap-3"
          >
            <Skeleton className="h-8 w-24 motion-reduce:animate-none" />
            <Skeleton className="h-[76px] w-full rounded-lg motion-reduce:animate-none" />
            <Skeleton className="h-11 w-full rounded-lg motion-reduce:animate-none" />
            <Skeleton className="h-3 w-40 motion-reduce:animate-none" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Verified token and contract data are required to trade.
          </p>
        ))}
      {walletFeedback && (
        <div className="text-xs text-muted-foreground">{walletFeedback}</div>
      )}
    </div>
  );

  return (
    <>
      <LaunchPanel className="trade-panel-neutral relative z-10 overflow-hidden rounded-2xl border border-border bg-white shadow-none ring-0 dark:bg-card dark:ring-0 lg:max-h-[calc(100svh-48px)] lg:overflow-y-auto [scrollbar-width:thin]">
        {identity}
        {wide ? (
          form
        ) : (
          <Sheet open={open} onOpenChange={setOpen}>
            <div className="p-4 sm:p-5">
              <Button className="w-full" onClick={() => setOpen(true)}>
                Buy / Sell
              </Button>
            </div>
            {/* Page entrance transforms must not contain this viewport-fixed control. */}
            {typeof document !== 'undefined' && createPortal(
              <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-divider bg-card px-4 py-3 lg:hidden">
                <Button className="w-full" onClick={() => setOpen(true)}>
                  Buy / Sell {name}
                </Button>
              </div>,
              document.body,
            )}
            <SheetContent
              side="bottom"
              keepMounted
              className="launch-details trade-panel-neutral max-h-[90svh] overflow-y-auto rounded-t-2xl"
            >
              <div className="px-4 pt-4 pr-12 sm:px-5 sm:pt-5 sm:pr-12">
                <SheetTitle>Trade {name}</SheetTitle>
                <SheetDescription>
                  Buy or sell on the bonding curve.
                </SheetDescription>
              </div>
              {form}
              <div ref={setQuoteHost} className="mx-4 -mt-4 mb-4 sm:mx-5 sm:-mt-5 sm:mb-5" />
            </SheetContent>
          </Sheet>
        )}
      </LaunchPanel>
      {wide && <div ref={setQuoteHost} className="trade-panel-neutral relative -mt-3" />}
    </>
  );
}
