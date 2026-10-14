export function TransactionHash({
  hash,
  label,
}: {
  hash: string;
  label: string;
}) {
  return (
    <a
      className="break-all text-sm underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
    >
      {label}: {hash}
    </a>
  );
}
