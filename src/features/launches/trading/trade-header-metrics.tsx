import type { ReactNode } from 'react';
import { TradeHint } from './trade-hint';
export function TradeHeaderMetrics({
  pair,
  price,
  priceNote,
  fdv,
  metrics,
}: {
  pair: string;
  price: ReactNode;
  priceNote: ReactNode;
  fdv?: ReactNode;
  metrics?: ReactNode;
}) {
  return (
    <dl className="grid grid-cols-2 gap-y-4 tabular-nums sm:grid-cols-3 xl:grid-cols-5 [&>div]:min-w-0 [&>div]:border-l [&>div]:border-border [&>div]:pl-4 [&>div:first-child]:border-l-0 [&>div:first-child]:pl-0 [&>div:nth-child(2n+1)]:border-l-0 [&>div:nth-child(2n+1)]:pl-0 sm:[&>div:nth-child(2n+1)]:border-l sm:[&>div:nth-child(2n+1)]:pl-4 sm:[&>div:nth-child(3n+1)]:border-l-0 sm:[&>div:nth-child(3n+1)]:pl-0 xl:[&>div:nth-child(n+2)]:border-l xl:[&>div:nth-child(n+2)]:pl-4">
      <div className="min-w-0">
        <dt className="text-small text-muted-foreground">
          <TradeHint
            label={`FDV · ${pair}`}
            help="Fully diluted value: total token supply multiplied by the current marginal price. This is not the amount raised."
          />
        </dt>
        <dd className="mt-1 break-words text-mid font-semibold">
          {fdv ?? '—'}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-small text-muted-foreground">
          <TradeHint
            label={`Price · ${pair}`}
            help="Current marginal price per token, before fees. A trade’s average execution price can differ as it moves along the curve."
          />
        </dt>
        <dd className="mt-1 break-words text-mid font-semibold">{price}</dd>
        <div className="mt-1 text-small text-muted-foreground">{priceNote}</div>
      </div>
      {metrics}
    </dl>
  );
}
