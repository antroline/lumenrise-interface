import { PageHeader } from '@/components/page-header'
import { Leaderboard } from './_components/leaderboard'

export default function ExplorerPage() {
  return <div className="space-y-7"><PageHeader eyebrow="Explore / Reputation" title="Reputation leaderboard" description="Discover how participants build trust across Stellar activity, development and the ecosystem." /><p className="text-small text-muted-foreground">Illustrative profiles and scores. Public leaderboard data is not connected yet.</p><Leaderboard /></div>
}
