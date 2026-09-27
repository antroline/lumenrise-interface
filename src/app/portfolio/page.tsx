'use client'

import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import { AuthGate } from '@/components/auth-gate'
import { PageHeader, SectionHeader } from '@/components/page-header'
import { ProjectMark, type ProjectMarkName } from '@/components/project-mark'
import { Stat, StatBar } from '@/components/stat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useLaunchpad } from '@/lib/launchpad'

const positions: { name: ProjectMarkName; subtitle: string; position: string; amount: string; allocation: string; status: string; href: string }[] = [
  { name: 'Northstar', subtitle: 'Closes Sep 29', position: 'Commitment', amount: '1,500 USDC', allocation: '≈ 35,710 NSTR', status: 'Withdrawable', href: '/launch/northstar/participate' },
  { name: 'Commons', subtitle: 'Closes Sep 29', position: 'Commitment', amount: '2,000 USDC', allocation: '≈ 8,120 CMNS', status: 'Withdrawable', href: '/launch/commons/participate' },
  { name: 'Meridian', subtitle: 'Ends Sep 30', position: 'Bid #1 · 0.32', amount: '3,200 USDC', allocation: '≈ 10,000 MRDN', status: 'In range · est.', href: '/auction/meridian' },
  { name: 'Meridian', subtitle: 'Ends Sep 30', position: 'Bid #2 · 0.26', amount: '1,560 USDC', allocation: '—', status: 'Below range · est.', href: '/auction/meridian' },
]
const allocations: { name: ProjectMarkName; ticker: string; total: string; claimed: string; claimable: string; locked: string; progress: number; value: string; href: string }[] = [
  { name: 'Harbor', ticker: 'HBR', total: '4,000', claimed: '1,500', claimable: '1,250', locked: '1,250', progress: 69, value: '$830', href: '/trade/harbor' },
  { name: 'Kiln', ticker: 'KILN', total: '6,200', claimed: '3,100', claimable: '0', locked: '3,100', progress: 50, value: '$663', href: '/trade/kiln' },
  { name: 'Contour', ticker: 'CNTR', total: '12,500', claimed: '12,500', claimable: '0', locked: '0', progress: 100, value: '$1,164', href: '/trade/contour' },
]

function ProjectCell({ name, subtitle }: { name: ProjectMarkName; subtitle: string }) {
  return <div className="flex items-center gap-2.5"><ProjectMark name={name} size={32} /><div><b className="block text-ui">{name}</b><span className="font-mono text-2xs text-faint">{subtitle}</span></div></div>
}

export default function PortfolioPage() {
  const { isSignedIn } = useLaunchpad()
  if (!isSignedIn) return <AuthGate destination="/portfolio" description="Connect your Stellar wallet to view your portfolio and saved launch activity." />
  return <div className="flex flex-col gap-6">
    <PageHeader eyebrow="Portfolio" title="Your portfolio" description="Everything you have joined, what is still an estimate and what is final." actions={<div className="flex gap-2"><Button variant="outline" size="sm" render={<Link href="/settings" />} nativeButton={false}>All wallets</Button><Button variant="outline" size="sm" disabled title="Portfolio export requires live position data"><Download data-icon="inline-start" /> Export CSV</Button></div>} />
    <p className="text-small text-muted-foreground">Positions below illustrate the reference layout. Live wallet positions and claims are not connected yet.</p>
    <StatBar columns={5}><Stat label="Committed" value="3,500" unit="USDC" hint="2 active launches" /><Stat label="In open bids" value="4,760" unit="USDC" hint="Locked · 1 auction" /><Stat label="Claimable now" value="1,250" unit="HBR" hint="From 1 allocation" tone="highlight" /><Stat label="Locked · vesting" value="4,350" unit="tokens" hint="HBR, KILN · 2 schedules" /><Stat label="Market value · est." value="$2,657" hint="At illustrative DEX prices" /></StatBar>
    <Card className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-lime text-ink"><Download className="size-5" /></span><div><h2 className="font-semibold">1,250 HBR shown ready to claim</h2><p className="text-small text-muted-foreground">Harbor · reference allocation · claim contract integration pending</p></div></div><Button disabled title="Claims are not connected to a contract">Claim unavailable</Button></Card>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><Card className="min-w-0"><SectionHeader title="Active commitments and bids" description="Allocations here are estimates until each launch publishes final allocations." /><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-small"><thead className="border-b font-mono text-2xs uppercase text-faint"><tr>{['Launch','Position','Amount','Estimated allocation','Status',''].map(label=><th key={label} className="py-3">{label}</th>)}</tr></thead><tbody>{positions.map((row,index)=><tr key={`${row.name}-${index}`} className="border-b last:border-0"><td className="py-3"><ProjectCell name={row.name} subtitle={row.subtitle} /></td><td>{row.position}</td><td className="font-semibold">{row.amount}</td><td>{row.allocation}</td><td><Badge variant={row.status.startsWith('Below')?'warn':'ok'}>{row.status}</Badge></td><td><Link href={row.href} className="underline underline-offset-2">View</Link></td></tr>)}</tbody></table></div></Card><Card><SectionHeader title="Upcoming unlocks" /><div className="flex flex-col gap-5">{[['1,250 HBR','Oct 02 · Harbor','Final unlock'],['775 KILN','Oct 11 · Kiln','Monthly unlock'],['775 KILN','Nov 11 · Kiln','Monthly unlock'],['775 KILN','Dec 11 · Kiln','Monthly unlock']].map(([amount,date,label])=><div key={date} className="flex items-start justify-between gap-3 border-l border-border pl-4"><div><b className="text-ui">{amount}</b><p className="font-mono text-2xs text-muted-foreground">{date}</p></div><span className="text-small text-muted-foreground">{label}</span></div>)}</div></Card></div>
    <Card><SectionHeader title="Allocations" description="Final allocations from completed launches." /><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-small"><thead className="border-b font-mono text-2xs uppercase text-faint"><tr>{['Token','Final allocation','Claimed','Claimable','Locked','Vesting','Market value · est.',''].map(label=><th key={label} className="py-3">{label}</th>)}</tr></thead><tbody>{allocations.map(row=><tr key={row.ticker} className="border-b last:border-0"><td className="py-3"><ProjectCell name={row.name} subtitle={row.ticker} /></td><td>{row.total}</td><td>{row.claimed}</td><td>{row.claimable}</td><td>{row.locked}</td><td className="min-w-24"><div className="flex items-center gap-2"><Progress value={row.progress} /><span>{row.progress}%</span></div></td><td>{row.value}</td><td><Button variant="outline" size="xs" render={<Link href={row.href} />} nativeButton={false}>Trade</Button></td></tr>)}</tbody></table></div></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><SectionHeader title="History" /><Tabs defaultValue="claims"><TabsList><TabsTrigger value="claims">Claims</TabsTrigger><TabsTrigger value="launches">Past launches</TabsTrigger></TabsList><TabsContent value="claims">{[['Harbor','1,500 HBR','Sep 02'],['Kiln','3,100 KILN','Aug 11'],['Contour','12,500 CNTR','Jul 12']].map(([name,amount,date])=><div key={name} className="flex justify-between border-b py-4 text-small"><span><b>Claimed</b><small className="block text-muted-foreground">{name}</small></span><span>{amount}</span><span className="font-mono">{date}</span></div>)}</TabsContent><TabsContent value="launches"><p className="py-4 text-small text-muted-foreground">Past launch history requires live wallet data.</p></TabsContent></Tabs></Card><Card><SectionHeader title="Following" action={<Link href="/settings" className="flex items-center text-small">Manage <ArrowRight className="size-3" /></Link>} />{(['Tidewell','Vessel','Lattice','Harbor'] as ProjectMarkName[]).map(name=><div key={name} className="flex items-center justify-between border-b py-3 last:border-0"><ProjectCell name={name} subtitle={name==='Harbor'?'Trading':'Upcoming'} /><Badge variant="soft">{name==='Harbor'?'Trading':'Upcoming'}</Badge></div>)}</Card></div>
  </div>
}
