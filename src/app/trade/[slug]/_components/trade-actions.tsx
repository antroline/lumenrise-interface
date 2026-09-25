'use client'

import { useState } from 'react'
import { Copy, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLaunchpad } from '@/lib/launchpad'

export function FollowButton({ name }: { name: string }) {
  const { notify } = useLaunchpad()
  const [following, setFollowing] = useState(true)
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={following}
      onClick={() => {
        setFollowing((current) => !current)
        notify(following ? `Unfollowed ${name}.` : `Following ${name}. Updates will appear in your feed.`)
      }}
    >
      <Star data-icon="inline-start" />
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}

export function CopyIssuerButton({ issuer }: { issuer: string }) {
  const { notify } = useLaunchpad()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(issuer)
        notify(`Issuer address ${issuer} copied to clipboard.`)
      }}
    >
      Issuer
      <span className="font-mono text-xs font-normal text-secondary-foreground">{issuer}</span>
      <Copy data-icon="inline-end" />
    </Button>
  )
}
