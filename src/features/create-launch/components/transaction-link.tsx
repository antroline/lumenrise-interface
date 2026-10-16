import { ExternalLink } from 'lucide-react';

export function TransactionLink({
  hash,
  label = 'View transaction',
}: {
  hash?: string;
  label?: string;
}) {
  if (!hash) return null;
  return (
    <a
      className="inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}
