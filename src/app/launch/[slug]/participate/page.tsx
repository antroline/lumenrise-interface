import { notFound } from 'next/navigation'
import { BackLink, ProjectHeading, SectionHeader } from '@/components/page-header'
import { ProjectMark } from '@/components/project-mark'
import { Stat, StatBar, KeyValue } from '@/components/stat'
import { Stepper } from '@/components/stepper'
import { StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getLaunch } from '@/lib/data'
import { CommitmentForm } from './commitment-form'

export default async function ParticipatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const launch = getLaunch(slug)
  if (!launch) notFound()
  return <div className="flex flex-col gap-6">
    <BackLink href={`/launch/${slug}`}>{launch.name}</BackLink>
    <ProjectHeading mark={<ProjectMark name={launch.name} size={56} />} eyebrow="Participate" title={`${launch.name} community round`} actions={<><StatusPill status={launch.phase} /><Badge variant="tag-outline">Reputation-based allocation</Badge><Badge variant="net">TESTNET</Badge></>} />
    <Card><Stepper steps={[{key:'eligibility',label:'Check eligibility',state:'done'},{key:'commit',label:'Commit',state:'current'},{key:'allocation',label:'Final allocation',state:'todo'},{key:'claim',label:'Claim',state:'todo'}]} /></Card>
    <StatBar columns={4}><Stat label="Committed" value="1,500" unit="USDC" hint="Illustrative · 2 deposits" /><Stat label="Max allocation" value="2,000" unit="USDC" hint="Reference level 4" /><Stat label="Required reputation" value="40" unit="Stellar activity" hint="Reference score 82" /><Stat label="Estimated allocation" value="≈ 35,710" unit={launch.ticker} hint="May change until settlement" tone="muted" /></StatBar>
    <p className="text-small text-muted-foreground">Reference amounts and eligibility are illustrative. Wallet balances and contract transactions are not connected in this frontend.</p>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"><div className="flex min-w-0 flex-col gap-5"><CommitmentForm slug={slug} ticker={launch.ticker} open={launch.phase==='live'} /><Card><SectionHeader title="Why you are eligible" description="Rules for this launch and the evidence used to check them." /><p className="text-small text-muted-foreground">Connect a wallet to check live eligibility. The reference result below is illustrative.</p>{[['Stellar activity signal ≥ 40','82','Horizon ledger data'],['Primary wallet older than 90 days','3 y 2 mo','First transaction ledger'],['No Sybil flag for this launch','No linked accounts','LumenRise Sybil model']].map(([rule,value,source])=><div key={rule} className="grid grid-cols-[1fr_90px] gap-3 border-t py-3 text-small sm:grid-cols-[1fr_110px_1fr_50px]"><b>{rule}</b><span>{value}</span><span className="text-muted-foreground">{source}</span><span className="text-ok">Met</span></div>)}</Card></div><aside className="flex flex-col gap-5"><Card><SectionHeader title="Vesting terms" /><div className="h-24 bg-accent [clip-path:polygon(0_72%,100%_0,100%_100%,0_100%)]" aria-label="25 percent at launch, then linear vesting" /><KeyValue label="At TGE · Oct 02">25%</KeyValue><KeyValue label="Cliff">1 month</KeyValue><KeyValue label="Then">75% linear over 6 months</KeyValue><KeyValue label="Fully unlocked">Apr 02, 2027</KeyValue></Card><Card><SectionHeader title="Claim" /><KeyValue label="Final allocation">Published Sep 30</KeyValue><KeyValue label="Claimable">0 {launch.ticker}</KeyValue><KeyValue label="Locked">After final allocation</KeyValue><button disabled className="w-full rounded-lg bg-muted p-3 text-ui text-faint">Claim opens Oct 02 · 14:00 UTC</button></Card><Card><SectionHeader title="Your activity" /><p className="text-small text-muted-foreground">Activity appears here after contract integration. No live deposits are shown.</p></Card></aside></div>
  </div>
}
