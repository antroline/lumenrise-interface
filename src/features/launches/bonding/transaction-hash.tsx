import { API_NETWORK } from '@/lib/stellar/network';
import { Globe } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function TransactionHash({
  hash,
  label,
  compact = false,
}: {
  hash: string;
  label: string;
  compact?: boolean;
}) {
  const href = `https://stellar.expert/explorer/${API_NETWORK}/tx/${hash}`;
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={hash}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-11 w-full min-w-0 gap-2 rounded-lg border-foreground/25 bg-transparent px-3 text-xs font-medium',
        )}
      >
        <Globe aria-hidden="true" className="size-4" />
        {label}
      </a>
    );
  }
  return (
    <a
      className="break-all text-sm underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      title={hash}
      href={href}
    >
      {label}: {hash}
    </a>
  );
}
