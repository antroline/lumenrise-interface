import { TableRow, TableCell } from '@/components/ui/table';
import { displayAmount } from '@/lib/api/launches/display';
import type { getTrades } from '@/lib/api/launches/market';
import { TradeTooltipText } from './trade-tooltip';
export function IndexedTradeRow({
  trade,
  asOf,
  amountScale = 7,
  priceScale = 7,
}: {
  trade: Awaited<ReturnType<typeof getTrades>>['items'][number];
  asOf: number;
  amountScale?: number;
  priceScale?: number;
}) {
  return (
    <TableRow className="rounded-2xl">
      <TableCell>
        <TradeTooltipText content={new Date(trade.tradedAt).toUTCString()}>
          <time dateTime={trade.tradedAt} className="whitespace-nowrap">
            {new Date(trade.tradedAt).toLocaleString(
              'en-US',
              asOf - Date.parse(trade.tradedAt) < 86_400_000
                ? { hour: '2-digit', minute: '2-digit' }
                : { month: 'short', day: 'numeric' },
            )}
          </time>
        </TradeTooltipText>
      </TableCell>
      <TableCell
        className={
          trade.side === 'buy'
            ? 'font-semibold text-ok'
            : 'font-semibold text-bad'
        }
      >
        {trade.side === 'buy' ? 'Buy' : 'Sell'}
      </TableCell>
      <TableCell
        title="Estimate: token amount × average execution price, before fees"
        className="font-semibold tabular-nums whitespace-nowrap"
      >
        {displayAmount(
          (
            (BigInt(trade.assetAmount) * BigInt(trade.executionPrice)) /
            (BigInt(10) ** BigInt(amountScale))
          ).toString(),
          3,
          priceScale,
        )}
      </TableCell>
      <TableCell className="tabular-nums">
        {displayAmount(trade.assetAmount, 3, amountScale)}
      </TableCell>
      <TableCell className="tabular-nums">
        {displayAmount(trade.executionPrice, undefined, priceScale)}
      </TableCell>
    </TableRow>
  );
}
