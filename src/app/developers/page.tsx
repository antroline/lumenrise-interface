import type { Metadata } from 'next'
import { Code } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'API & SDK' }

export default function DevelopersPage() {
  return (
    <ComingSoon
      icon={Code}
      title="Developer platform"
      description="API keys, SDK examples, policy tooling, webhooks and eligibility queries for other Stellar applications."
    />
  )
}
