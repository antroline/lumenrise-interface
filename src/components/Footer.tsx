import Link from 'next/link'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Logo />
        <p className="mt-3 text-[11px] text-muted">Identity and launch infrastructure for Stellar.</p>
      </div>
      <div className="footer-links">
        <Link href="/missions">Missions</Link>
        <Link href="/create">Create launch</Link>
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/explorer">Explorer</Link>
        <Link href="/cli">CLI & agents</Link>
      </div>
      <p className="mt-3 justify-self-end text-right text-[11px] text-muted max-[860px]:col-span-full max-[860px]:justify-self-start max-[860px]:text-left max-[600px]:col-span-auto">
        Illustrative product data · Built on Stellar
      </p>
    </footer>
  )
}
