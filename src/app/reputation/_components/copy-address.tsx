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
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address)
          notify('Wallet address copied', { tone: 'success' })
        } catch {
          notify('Could not copy the wallet address. Select and copy the displayed address instead.', { tone: 'error' })
        }
      }}
    >
      <Copy aria-hidden="true" />
    </Button>
  )
}
