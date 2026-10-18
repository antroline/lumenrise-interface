'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LaunchPageSkeleton } from '@/features/launches/components/launch-page-skeleton'

function ClientAppLoading() {
  const pathname = usePathname()
  if (!/^\/launch\/[^/]+\/?$/.test(pathname)) return null
  return (
    <div className="min-h-screen bg-page lg:flex">
      <div aria-hidden="true" className="hidden h-svh w-62 shrink-0 border-r border-sidebar-border bg-sidebar lg:block" />
      <div className="min-w-0 flex-1">
      <div aria-hidden="true" className="h-14 border-b border-sidebar-border lg:hidden" />
      <div className="px-4 pt-6 sm:px-5 sm:pt-8 lg:px-6 lg:pt-10">
      <LaunchPageSkeleton />
      </div>
      </div>
    </div>
  )
}

// The Blux wallet SDK and all account state are browser-only, so the app
// renders entirely on the client, matching the previous Vite SPA behavior.
const ClientApp = dynamic(() => import('./client-app'), {
  ssr: false,
  loading: ClientAppLoading,
})

export function Providers({
  children,
  apiBaseUrl,
}: {
  children: ReactNode
  apiBaseUrl: string
}) {
  return <ClientApp apiBaseUrl={apiBaseUrl}>{children}</ClientApp>
}
