import { formatSupplyShare } from '../../_launch/launch-draft';

export function SupplyShare({
  label,
  percent,
  supply,
  symbol,
}: {
  label: string;
  percent: string;
  supply: string;
  symbol: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-small text-muted-foreground">
        {label} · {percent || '—'}%
      </p>
      <p className="mt-1 break-all text-ui font-semibold tabular-nums">
        {formatSupplyShare(supply, percent)} {symbol || 'tokens'}
      </p>
    </div>
  );
}
