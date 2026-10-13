'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LaunchPageSkeleton } from '@/app/launch/[slug]/_components/launch-page-skeleton'

function ClientAppLoading() {
  const pathname = usePathname()
  if (!/^\/launch\/[^/]+\/?$/.test(pathname)) return null
  return (
    <div className="px-4 pt-[92px] sm:px-5 sm:pt-[122px] lg:px-6 lg:pt-[130px]">
      <LaunchPageSkeleton />
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
