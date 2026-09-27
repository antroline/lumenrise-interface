'use client'

import Link from 'next/link'
import { ArrowRight, Check, Wallet } from 'lucide-react'
import { IconTile } from '@/components/icon-tile'
import { KeyValue, Label } from '@/components/stat'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { shortAddress } from '@/lib/connections'
import type { Launch } from '@/lib/data'
import { useLaunchpad } from '@/lib/launchpad'

export function FeaturedWalletCard({ launch }: { launch: Launch }) {
  const { isSignedIn, address, login, loginPending } = useLaunchpad()
  const connected = isSignedIn && address

  return (
    <div className="theme-reset relative flex flex-col gap-4 rounded-2xl border bg-card p-[22px] text-foreground">
      <div className="flex items-center justify-between">
        <Label>Your wallet</Label>
        {connected && <span className="font-mono text-xs text-secondary-foreground">{shortAddress(address)}</span>}
      </div>

      {connected ? (
        <div className="flex items-center gap-2.5">
          <IconTile tone="ok">
            <Check />
          </IconTile>
          <div className="flex flex-col">
            <b className="text-[15px]">Eligible for this launch</b>
            <span className="text-small text-muted-foreground">3 of 3 rules met · checked 2 min ago</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <IconTile>
            <Wallet />
          </IconTile>
          <div className="flex flex-col">
            <b className="text-[15px]">Check your eligibility</b>
            <span className="text-small text-muted-foreground">Connect a wallet to test it against 3 rules.</span>
          </div>
        </div>
      )}

      <Separator className="bg-divider" />
      <div>
        <KeyValue label="Max allocation" className="border-0 py-1">
          2,000 USDC
        </KeyValue>
        <KeyValue label="Accepted" className="border-0 py-1">
          USDC, XLM
        </KeyValue>
      </div>

      {connected ? (
        <Button className="w-full" render={<Link href={`/launch/${launch.slug}`} />} nativeButton={false}>
          View launch
          <ArrowRight data-icon="inline-end" />
        </Button>
      ) : (
        <Button className="w-full" disabled={loginPending} onClick={() => void login(`/launch/${launch.slug}`)}>
          <Wallet data-icon="inline-start" />
          {loginPending ? 'Connecting…' : 'Connect wallet'}
        </Button>
      )}
    </div>
  )
}
