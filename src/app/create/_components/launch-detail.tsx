import { shortAddress } from '../_launch/launch-state';

export function LaunchDetail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-divider py-3 last:border-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-mono text-[13px] break-all">
        {href ? (
          <a
            className="underline underline-offset-4"
            href={href}
            target="_blank"
            rel="noreferrer"
            title={value}
          >
            {shortAddress(value)}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
