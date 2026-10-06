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
    <div>
      <p className="text-small text-muted-foreground">
        {label} · {percent || '—'}%
      </p>
      <p className="mt-1 text-ui font-semibold tabular-nums">
        {formatSupplyShare(supply, percent)} {symbol || 'tokens'}
      </p>
    </div>
  );
}
