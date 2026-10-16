import type { ReactNode } from 'react';
export function TradeTokenPill({
  symbol,
  mark,
}: {
  symbol: string;
  mark: ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-background py-1.5 pr-3 pl-1.5 text-small font-semibold">
      {mark}
      {symbol}
    </span>
  );
}
