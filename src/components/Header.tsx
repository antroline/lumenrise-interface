'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { shortAddress } from '@/lib/connections'
import { useLaunchpad } from '@/lib/launchpad'
import { Icon } from './Icon'
import { Logo } from './Logo'

const nav = [
  { label: 'Discover', to: '/' },
  { label: 'Reputation', to: '/reputation' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Developers', to: '/developers' },
]

export function Header() {
  const pathname = usePathname()
  const { isSignedIn, address, loginPending, login } = useLaunchpad()

  return (
    <header className="site-header">
      <Logo />
      <nav className="main-nav" aria-label="Primary navigation">
        {nav.map((item) => (
          <Link
            key={item.to}
            href={item.to}
            className={pathname === item.to ? 'active' : undefined}
            aria-current={pathname === item.to ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {isSignedIn ? (
        <Link href="/settings" className="account-button" aria-label={`Account settings for ${shortAddress(address)}`}>
          <span className="size-[7px] rounded-full bg-[#20a864]" />
          <span>{shortAddress(address)}</span>
          <Icon name="settings" size={16} />
        </Link>
      ) : (
        <button
          className="button button-primary header-login"
          type="button"
          disabled={loginPending}
          onClick={() => void login('/portfolio')}
        >
          {loginPending ? 'Opening Blux…' : 'Log in'}
        </button>
      )}
    </header>
  )
}
