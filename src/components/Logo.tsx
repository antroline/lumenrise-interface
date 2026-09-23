import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="wordmark" aria-label="Launchpad home">
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M14 2.5v23M2.5 14h23M5.8 5.8l16.4 16.4M22.2 5.8 5.8 22.2" />
        <circle cx="14" cy="14" r="4.2" />
      </svg>
      <span>Launchpad</span>
    </Link>
  )
}
