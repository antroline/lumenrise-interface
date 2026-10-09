import { cn } from '@/lib/utils';
import type { QuoteToken } from '../../_launch/launch-draft';

export function QuoteIcon({
  quote,
  className,
}: {
  quote: QuoteToken;
  className?: string;
}) {
  return (
    <img
      src={`/tokens/${quote.toLowerCase()}.svg`}
      alt=""
      className={cn('size-7 shrink-0', className)}
      aria-hidden="true"
    />
  );
}
