'use client'

import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLaunchpad } from '@/lib/launchpad'

export function CopyAddress({ address }: { address: string }) {
  const { notify } = useLaunchpad()

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Copy wallet address"
      onClick={() => {
        void navigator.clipboard?.writeText(address)
        notify('Wallet address copied')
      }}
    >
      <Copy aria-hidden="true" />
    </Button>
  )
}
