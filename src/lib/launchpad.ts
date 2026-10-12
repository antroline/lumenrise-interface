'use client'

import { createContext, useContext } from 'react'
import type { AccountProfile } from '@/lib/api/auth'

export type AccountState =
  | { status: 'signed-out' }
  | { status: 'preview' }
  | { status: 'checking' }
  | { status: 'unregistered' }
  | { status: 'registered'; profile: AccountProfile }
  | { status: 'error'; message: string }

export type AccountActionResult = { ok: true } | { ok: false; error: string }

export type LaunchpadContextValue = {
  isSignedIn: boolean
  address?: string
  loginPending: boolean
  /** Which part of the connect flow is running while loginPending is true. */
  loginPhase: 'connecting' | 'checking' | null
  login: (destination?: string) => Promise<void>
  logout: () => void
  notify: (message: string) => void
  /** Registration state of the signed-in provider user. */
  account: AccountState
  /** True when account-only pages may render (registered user or dev preview). */
  accountReady: boolean
  /** Re-runs the registration status check after a failure. */
  retryStatusCheck: () => void
  /** Registers the signed-in provider user with a name and an optional photo. */
  register: (input: {
    name: string
    avatar?: File | null
  }) => Promise<AccountActionResult>
  /** Re-reads the profile from the API and merges it into account state. */
  refreshProfile: () => Promise<void>
  updateAvatar: (file: File) => Promise<AccountActionResult>
  removeAvatar: () => Promise<AccountActionResult>
}

export const LaunchpadContext = createContext<LaunchpadContextValue | null>(null)

export function useLaunchpad() {
  const context = useContext(LaunchpadContext)
  if (!context) throw new Error('useLaunchpad must be used within the app providers')
  return context
}
