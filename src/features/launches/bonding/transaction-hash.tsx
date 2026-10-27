import { API_NETWORK } from '@/lib/stellar/network';
import { Globe } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function TransactionHash({
  hash,
  label,
  compact = false,
  className,
}: {
  hash: string;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const href = `https://stellar.expert/explorer/${API_NETWORK}/tx/${hash}`;
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-11 w-full min-w-0 gap-2 rounded-lg border-foreground/25 bg-transparent px-3 text-xs font-medium',
          className,
        )}
      >
        <Globe aria-hidden="true" className="size-4" />
        {label}
      </a>
    );
  }
  return (
    <a
      className={cn('break-all text-sm underline underline-offset-4', className)}
      target="_blank"
      rel="noreferrer"
      title={hash}
      href={href}
    >
      {label}: {hash}
    </a>
  );
}
