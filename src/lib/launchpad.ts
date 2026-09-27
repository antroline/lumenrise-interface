'use client'

import { createContext, useContext } from 'react'

export type LaunchpadContextValue = {
  isSignedIn: boolean
  address?: string
  loginPending: boolean
  login: (destination?: string) => Promise<void>
  logout: () => void
  notify: (message: string) => void
}

export const LaunchpadContext = createContext<LaunchpadContextValue | null>(null)

export function useLaunchpad() {
  const context = useContext(LaunchpadContext)
  if (!context) throw new Error('useLaunchpad must be used within the app providers')
  return context
}
