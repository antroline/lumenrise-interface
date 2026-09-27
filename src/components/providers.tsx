'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

// The Blux wallet SDK and all account state are browser-only, so the app
// renders entirely on the client, matching the previous Vite SPA behavior.
const ClientApp = dynamic(() => import('./client-app'), { ssr: false })

export function Providers({ children }: { children: ReactNode }) {
  return <ClientApp>{children}</ClientApp>
}
