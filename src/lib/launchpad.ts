'use client'

import { createContext, useContext } from 'react'
import type { AccountProfile, ProfileUpdateInput } from '@/lib/api/auth'
import type { NotificationOptions } from '@/lib/notifications'

export type AccountState =
  | { status: 'signed-out' }
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
  notify: (message: string, options?: NotificationOptions) => void
  /** Registration state of the signed-in provider user. */
  account: AccountState
  /** True when account-only pages may render (registered user). */
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
  /** Saves changed name/photo fields and merges the returned profile into shared state. */
  updateProfile: (input: ProfileUpdateInput) => Promise<AccountActionResult>
  updateAvatar: (file: File) => Promise<AccountActionResult>
  removeAvatar: () => Promise<AccountActionResult>
  /** Base reuses registration to synchronize provider-verified linked wallets. */
  syncWallets?: () => Promise<AccountActionResult>
  /** Base EOA execution capability; a linked smart address is insufficient. */
  baseSigningSupported?: boolean
}

export const LaunchpadContext = createContext<LaunchpadContextValue | null>(null)

export function useLaunchpad() {
  const context = useContext(LaunchpadContext)
  if (!context) throw new Error('useLaunchpad must be used within the app providers')
  return context
}
