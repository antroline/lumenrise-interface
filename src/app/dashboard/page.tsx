import Link from 'next/link'
import { ArrowRight, Eye, FileCode2, Plus, Users } from 'lucide-react'
import { LineChart } from '@/components/charts'
import { ProjectHeading } from '@/components/page-header'
import { ProjectMark } from '@/components/project-mark'
import { Stat, StatBar, KeyValue } from '@/components/stat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { featuredLaunch } from '@/lib/data'
import { RuledPanel, Trajectory } from '@/components/visual-system'

const reputationLevels = [4, 17, 38, 31, 9, 1]
const flagged = [
  { group: 'Cluster A', accounts: 14, reason: 'Same funding account, created within 2 hours', risk: 'High' },
  { group: 'Cluster B', accounts: 9, reason: 'Identical commit timing across wallets', risk: 'High' },
  { group: 'Cluster C', accounts: 11, reason: 'Shared GitHub and X accounts re-linked', risk: 'Medium' },
  { group: 'Singles', accounts: 7, reason: 'New wallets with borrowed XLM for reserve', risk: 'Low' },
]
const commitmentSizes = [
  { label: '50–250', count: '1,420', value: 100 }, { label: '250–500', count: '980', value: 69 },
  { label: '500–1K', count: '610', value: 43 }, { label: '1K–2K', count: '610', value: 43 },
  { label: '2K–3K', count: '192', value: 14 },
]

export default function DashboardPage() {
  return <div className="space-y-7">
    <ProjectHeading
      specimen="Northstar"
      mark={<ProjectMark name="Northstar" size={50} />}
      eyebrow="Project dashboard"
      title="Northstar"
      meta={<Badge variant="live">Live example</Badge>}
      description={<span className="text-ui text-muted-foreground">Illustrative dashboard · sale dates and activity are sample data</span>}
      actions={<><Button variant="outline" disabled title="Team management is not connected"><Users data-icon="inline-start" /> Team · 4 members</Button><Button variant="outline" render={<Link href={`/launch/${featuredLaunch.slug}`} />} nativeButton={false}><Eye data-icon="inline-start" /> View page</Button><Button variant="dark" disabled title="Publishing is not connected">Publish update</Button></>}
    />

    <RuledPanel><Trajectory label="Northstar launch progression" active={1} steps={[{label:'Announced'},{label:'Sale live'},{label:'Allocation'},{label:'Claims'}]} /></RuledPanel>

    <nav aria-label="Dashboard sections" className="flex gap-6 overflow-x-auto border-b text-ui font-medium whitespace-nowrap"><a href="#overview" aria-current="page" className="border-b-2 border-foreground pb-3">Overview</a>{[['Participants', 'participants'], ['Sybil review', 'sybil'], ['Allocation', 'commitments'], ['Contracts', 'contracts'], ['Campaigns', 'campaigns'], ['Page & updates', 'updates']].map(([item, target]) => <a key={target} href={`#${target}`} className="pb-3 text-muted-foreground hover:text-foreground">{item}</a>)}</nav>
    <div id="overview"><StatBar columns={5}><Stat label="Capital raised" value="$312,480" hint="+$18,240 · 24h · 74% of target" /><Stat label="Participants" value="3,240" hint="+212 · 24h" /><Stat label="Commitments" value="3,812" hint="Avg 82 USDC · 142 withdrawn" /><Stat tone="bad" label="Suspected Sybil" value="41" unit="accounts" hint="Needs review · 1.3%" /><Stat label="Claims" value="—" hint="Example: Oct 02 · 14:00 UTC" /></StatBar></div>

    <div id="participants" className="grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <Card><div className="flex justify-between gap-3"><div><CardTitle>Capital raised</CardTitle><CardDescription>Net of withdrawals · illustrative USDC equivalent</CardDescription></div><Badge variant="tag-outline">Sale</Badge></div><div className="mt-2 text-[32px] font-semibold tabular-nums">$312,480 <span className="text-ui font-normal text-muted-foreground">/ $420,000</span></div><LineChart data={[18, 25, 30, 37, 42, 49, 52, 61, 66, 74]} min={0} max={100} yTicks={[0, 25, 50, 75, 100]} xLabels={['Sep 22', 'Sep 24', 'Sep 26', 'Sep 29']} formatTick={(v) => `${v}%`} label="Illustrative capital raised, rising to 74 percent of target" /></Card>
      <Card><div className="flex justify-between"><CardTitle>Reputation of participants</CardTitle><span className="font-mono text-2xs text-faint">BY LEVEL</span></div><div className="mt-6 flex h-44 items-end gap-2">{reputationLevels.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-small">{value}%</span><span className={`w-full rounded-t-md ${index === 2 ? 'bg-lime' : 'bg-foreground'}`} style={{ height: `${value * 2.5}%` }} /><span className="font-mono text-2xs text-faint">L{index + 1}</span></div>)}</div><CardDescription>Median participant is Level 3. 96% pass the Stellar activity rule.</CardDescription></Card>
    </div>

    <div id="sybil" className="grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><CardTitle>Sybil review</CardTitle><CardDescription>Sample flags. No account is excluded by this preview.</CardDescription></div><Button variant="outline" size="sm" disabled title="Live review is not connected">Open review <ArrowRight data-icon="inline-end" /></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-small"><thead className="border-y bg-muted font-mono text-2xs tracking-caps text-muted-foreground uppercase"><tr><th className="p-3 pl-5">Group</th><th>Accounts</th><th>Reason</th><th>Confidence</th><th>Decision</th></tr></thead><tbody>{flagged.map((row) => <tr key={row.group} className="border-b last:border-0"><td className="p-3 pl-5 font-semibold">{row.group}</td><td>{row.accounts}</td><td>{row.reason}</td><td><Badge variant={row.risk === 'High' ? 'bad' : row.risk === 'Medium' ? 'warn' : 'tag-outline'}>{row.risk}</Badge></td><td className="space-x-1"><Button size="xs" variant="outline" disabled>Keep</Button><Button size="xs" variant="destructive" disabled>Exclude</Button></td></tr>)}</tbody></table></div></Card>
      <Card id="commitments"><div className="flex justify-between"><CardTitle>Commitment sizes</CardTitle><span className="font-mono text-2xs text-faint">USDC</span></div><div className="mt-4 space-y-3">{commitmentSizes.map((item) => <div key={item.label}><div className="mb-1 flex justify-between font-mono text-small"><span>{item.label}</span><span>{item.count}</span></div><Progress value={item.value} /></div>)}</div><div className="mt-auto border-t border-divider pt-3"><KeyValue label="Top 10 wallets">6.1% of raise</KeyValue><KeyValue label="Gini of estimated allocation">0.41</KeyValue></div></Card>
    </div>

    <div id="contracts" className="grid scroll-mt-6 gap-5 md:grid-cols-3">
      <Card variant="ruled"><div className="flex justify-between"><CardTitle>Contracts</CardTitle><FileCode2 className="size-4" /></div><CardDescription>Example addresses shown in the design reference</CardDescription><KeyValue label="Sale">CDA6…E91P</KeyValue><KeyValue label="Vesting">CCF2…R48N</KeyValue><KeyValue label="Eligibility">CB79…M22D</KeyValue></Card>
      <Card id="campaigns" variant="ruled"><div className="flex justify-between"><CardTitle>Campaigns</CardTitle><Button variant="ghost" size="xs" render={<Link href="/missions" />} nativeButton={false}><Plus data-icon="inline-start" /> View</Button></div><CardDescription>Example campaigns linked to this launch</CardDescription><KeyValue label="Community builders">1,208 joined</KeyValue><KeyValue label="Early contributors">426 joined</KeyValue><Button variant="outline" size="sm" render={<Link href="/missions" />} nativeButton={false}>View missions <ArrowRight data-icon="inline-end" /></Button></Card>
      <Card id="updates"><div className="flex justify-between"><CardTitle>Publish update</CardTitle><Badge variant="tag-outline">Preview</Badge></div><CardDescription>Project announcements require a connected publishing service.</CardDescription><div className="rounded-lg border bg-muted p-3 text-small text-muted-foreground">Final allocations will be published after the sale closes. Claims open when the vesting contract is ready.</div><Button variant="dark" size="sm" disabled title="Publishing is not connected">Publish</Button></Card>
    </div>
  </div>
}
