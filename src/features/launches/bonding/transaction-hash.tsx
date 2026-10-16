export function TransactionHash({
  hash,
  label,
  compact = false,
}: {
  hash: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <a
      className="break-all text-sm underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      title={hash}
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
    >
      {label}{!compact && `: ${hash}`}
    </a>
  );
}
