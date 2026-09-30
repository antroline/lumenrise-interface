import type { Metadata } from 'next'
import { Megaphone } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Campaigns' }

export default function CampaignsPage() {
  return (
    <ComingSoon
      icon={Megaphone}
      kind="campaigns"
      title="Growth campaigns"
      description="Build quests, referrals, allowlists and partner campaigns around genuine participation."
    />
  )
}
