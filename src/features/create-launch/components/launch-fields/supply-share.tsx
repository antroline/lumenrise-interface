import { formatSupplyShare } from '../../lib/launch-draft';
import { cn } from '@/lib/utils';

export function SupplyShare({
  label,
  percent,
  supply,
  symbol,
  colorClassName,
}: {
  label: string;
  percent: string;
  supply: string;
  symbol: string;
  colorClassName: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-small text-muted-foreground">
        <span
          aria-hidden="true"
          className={cn('size-3 shrink-0 rounded-full ring-1 ring-inset ring-foreground/20', colorClassName)}
        />
        <span>{label} · {percent || '—'}%</span>
      </p>
      <p className="mt-1 break-all text-ui font-semibold tabular-nums">
        {formatSupplyShare(supply, percent)} {symbol || 'tokens'}
      </p>
    </div>
  );
}
