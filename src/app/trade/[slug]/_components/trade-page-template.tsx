import type { ReactNode } from 'react';

/** The Orbit trade page composition, shared by illustrative and indexed launches. */
export function TradePageTemplate({
  header,
  market,
  swap,
  footer,
}: {
  header: ReactNode;
  market: ReactNode;
  swap: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {header}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="flex min-w-0 flex-col gap-5">{market}</div>
        {swap}
      </div>
      {footer}
    </div>
  );
}
