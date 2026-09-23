'use client'

import Link from 'next/link'
import { useLaunchpad } from '@/lib/launchpad'
import { Icon } from './Icon'

export function AuthGate() {
  const { login, loginPending } = useLaunchpad()

  return (
    <section className="auth-gate">
      <div className="mb-[26px] grid size-[54px] place-items-center rounded-full bg-cobalt-wash text-cobalt">
        <Icon name="wallet" size={24} />
      </div>
      <h1>Log in to open your panel</h1>
      <p>
        Your portfolio, reputation signals, and connected identities are tied to the Stellar address created or
        connected through Blux.
      </p>
      <button
        className="button button-primary button-large"
        type="button"
        disabled={loginPending}
        onClick={() => void login('/portfolio')}
      >
        {loginPending ? 'Opening Blux…' : 'Continue with Blux'} <Icon name="arrow" />
      </button>
      <Link
        href="/"
        className="mt-[22px] inline-flex items-center gap-[5px] text-cobalt underline decoration-1 underline-offset-4"
      >
        Browse launches without an account
      </Link>
    </section>
  )
}
