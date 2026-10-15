'use client';

import type { ReactNode } from 'react';
import { useTradeCopy } from './use-trade-copy';
import { TradeCopyFeedback } from './trade-copy-feedback';
import { Copy } from 'lucide-react';
import { TradeTooltip } from './trade-tooltip';
import { TradeHeaderActions, type TradeProjectLinks } from './trade-header-actions';
import { TradeHeaderMetrics } from './trade-header-metrics';

export function TradeHeader({
  mark,
  name,
  ticker,
  pair,
  status,
  price,
  priceNote,
  metrics,
  links,
  address,
  fdv,
}: {
  mark: ReactNode;
  name: string;
  ticker: string;
  pair: string;
  status: ReactNode;
  price: ReactNode;
  priceNote: ReactNode;
  metrics?: ReactNode;
  links?: TradeProjectLinks;
  address?: string;
  fdv?: ReactNode;
}) {
  const { feedback, copy } = useTradeCopy();
  return (
    <header className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 overflow-hidden rounded-full">{mark}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h1 className="break-words text-[28px] font-medium leading-tight tracking-tight sm:text-[32px]">
                {name}
              </h1>
              <span className="text-lg text-muted-foreground">{ticker}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-small text-muted-foreground">
              {address ? (
                <span className="relative inline-flex items-center">
                  <TradeTooltip content={`Copy contract address: ${address}`}>
                    <button
                      type="button"
                      aria-label="Copy token contract address"
                      className="flex min-h-8 items-center gap-1.5 rounded-lg focus-visible:ring-3 focus-visible:ring-lime/60"
                      onClick={() => void copy(address, 'Address')}
                    >
                      {address.slice(0, 6)}…{address.slice(-4)}
                      <Copy className="size-3" />
                    </button>
                  </TradeTooltip>
                  <TradeCopyFeedback
                    message={
                      feedback?.label === 'Address'
                        ? feedback.message
                        : undefined
                    }
                  />
                </span>
              ) : (
                <span>
                  {ticker} / {pair}
                </span>
              )}
              {status}
            </div>
          </div>
        </div>
        <TradeHeaderActions
          links={links}
          copy={copy}
          copyMessage={
            feedback?.label === 'Link' ? feedback.message : undefined
          }
        />
      </div>
      <TradeHeaderMetrics
        pair={pair}
        price={price}
        priceNote={priceNote}
        fdv={fdv}
        metrics={metrics}
      />
    </header>
  );
}
