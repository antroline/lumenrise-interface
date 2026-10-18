import { TableRow, TableCell } from '@/components/ui/table';
import { Blockie } from '@/components/blockie';
import { displayAmount } from '@/lib/api/launches/display';
import type { getTrades } from '@/lib/api/launches/market';
import { TradeTooltipText } from './trade-tooltip';
export function IndexedTradeRow({
  trade,
  asOf,
}: {
  trade: Awaited<ReturnType<typeof getTrades>>['items'][number];
  asOf: number;
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
            BigInt(10_000_000)
          ).toString(),
          3,
        )}
      </TableCell>
      <TableCell className="tabular-nums">
        {displayAmount(trade.assetAmount)}
      </TableCell>
      <TableCell className="tabular-nums">
        {displayAmount(trade.executionPrice)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Blockie seed={trade.trader} size={16} className="rounded-full" />
          <span className="text-muted-foreground">
            <TradeTooltipText content={trade.trader}>
              {trade.trader.slice(0, 6)}…{trade.trader.slice(-4)}
            </TradeTooltipText>
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
