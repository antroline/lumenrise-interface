import type { Metadata } from 'next'
import { Hexagon } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'My Reputation' }

export default function ReputationPage() {
  return (
    <ComingSoon
      icon={Hexagon}
      kind="reputation"
      title="My Reputation — Coming soon"
      description="Your reputation profile will be available here. Activity, contributions and connected accounts will help you understand the signals behind project-specific eligibility."
    />
  )
}
