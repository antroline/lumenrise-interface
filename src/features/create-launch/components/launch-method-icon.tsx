import type { LaunchMethod } from '../lib/launch-draft';
import { cn } from '@/lib/utils';

export function LaunchMethodIcon({ method, className }: { method: LaunchMethod; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn('size-14 shrink-0', className)} aria-hidden="true" focusable="false">
      {method === 'bonding' ? (
        <>
          <path d="M12 12v38h40" opacity=".25" />
          <path d="M16 45c18 0 20-25 34-29v34H16Z" className="fill-primary/20" stroke="none" />
          <path d="M16 45c18 0 20-25 34-29" />
          <circle cx="50" cy="16" r="4" className="fill-primary" stroke="none" />
        </>
      ) : method === 'fixed' ? (
        <>
          <path d="M12 18h28l14 14-14 14H12Z" fill="currentColor" fillOpacity=".06" />
          <circle cx="22" cy="32" r="3" />
          <path d="M32 32h11" />
        </>
      ) : (
        <>
          <g transform="rotate(-38 32 27)">
            <rect x="18" y="12" width="28" height="15" rx="3" fill="currentColor" fillOpacity=".08" />
            <path d="M23 12v15m18-15v15M32 27v22" />
          </g>
          <path d="M34 52h20m-17-5h14v5H37Z" />
        </>
      )}
    </svg>
  );
}
