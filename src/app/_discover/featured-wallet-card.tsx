'use client'

import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shortAddress } from '@/lib/connections'
import type { Launch } from '@/lib/data'
import { useLaunchpad } from '@/lib/launchpad'

export function FeaturedWalletCard({ launch }: { launch: Launch }) {
  const { isSignedIn, address, login, loginPending } = useLaunchpad()
  const connected = isSignedIn && address

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-body text-muted-foreground">
        {connected ? `Wallet ${shortAddress(address)}` : 'Check eligibility'}
      </p>
      {connected ? (
        <Button size="lg" className="w-full sm:w-fit" render={<Link href={`/launch/${launch.slug}`} />} nativeButton={false}>
          View launch
          <ArrowRight data-icon="inline-end" />
        </Button>
      ) : (
        <Button size="lg" className="w-full sm:w-fit" disabled={loginPending} onClick={() => void login(`/launch/${launch.slug}`)}>
          <Wallet data-icon="inline-start" />
          {loginPending ? 'Connecting…' : 'Connect wallet'}
        </Button>
      )}
    </div>
  )
}
