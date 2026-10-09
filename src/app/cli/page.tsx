import type { Metadata } from 'next'
import { SquareTerminal } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'CLI & agents' }

export default function CliPage() {
  return (
    <ComingSoon
      icon={SquareTerminal}
      kind="cli"
      title="CLI & agents"
      description="Create, configure and deploy reproducible Stellar launches from a terminal or coding agent."
    />
  )
}
