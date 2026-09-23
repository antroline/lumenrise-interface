import type { Launch } from '@/lib/data'

export function TokenMark({ kind }: { kind: Launch['mark'] }) {
  return (
    <span className={`token-mark token-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        {kind === 'star' && <path d="M24 5v38M5 24h38M11 11l26 26M37 11 11 37" />}
        {kind === 'slash' && <><path d="m13 34 22-22" /><path d="m17 39 22-22" /></>}
        {kind === 'orbit' && <><circle cx="24" cy="24" r="11" /><path d="M5 24h38M24 5v38M11 11l26 26M37 11 11 37" /></>}
        {kind === 'hourglass' && <path d="M14 7h20M14 41h20M16 8c0 9 16 9 16 16S16 31 16 40M32 8c0 9-16 9-16 16s16 7 16 16" />}
        {kind === 'arc' && <><path d="M8 31c5-15 27-18 34-4" /><path d="M8 37c5-15 27-18 34-4" /><circle cx="15" cy="17" r="4" /></>}
        {kind === 'flag' && <><path d="M15 40V8M16 9h20l-6 8 6 8H16" /></>}
      </svg>
    </span>
  )
}
