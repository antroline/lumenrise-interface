import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Activity } from 'lucide-react'
import { StrKey } from '@stellar/stellar-sdk'
import { BondingCurvePage } from '@/app/launch/[slug]/_bonding/bonding-curve-page'
import { BackLink, ProjectHeading } from '@/components/page-header'
import { ProjectMark } from '@/components/project-mark'
import { Stat, StatBar } from '@/components/stat'
import { Badge } from '@/components/ui/badge'
import { InsetField, RuledPanel, Trajectory } from '@/components/visual-system'
import { getTradingToken } from '@/lib/data'
import { PoolTable } from './_components/pool-table'
import { PriceChart } from './_components/price-chart'
import { SwapPanel } from './_components/swap-panel'
import { CopyIssuerButton, FollowButton } from './_components/trade-actions'
import { priceSeriesByTimeframe, swapRoutes } from './_data'

export default async function TradePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (StrKey.isValidContract(slug)) return <BondingCurvePage key={slug} address={slug} surface="trade" />
  const token = getTradingToken(slug)
  if (!token) notFound()
  const price = Number(token.price.replace('$', ''))
  return <div className="flex flex-col gap-6">
    <BackLink href="/">Discover</BackLink>
    <ProjectHeading specimen={token.name} mark={<ProjectMark name={token.name} size={56} />} title={token.name} meta={<><Badge variant="tag">{token.ticker}</Badge><Badge variant="soft"><Activity /> Trading</Badge></>} description={<span className="text-small text-muted-foreground">Launched on LumenRise {token.launched}, 2026 · community round</span>} actions={<><FollowButton name={token.name} /><CopyIssuerButton issuer="GHBR…M2QX" /></>} />
    <nav className="flex gap-6 overflow-x-auto border-b text-ui font-medium"><Link href="/" className="pb-3 text-muted-foreground">Overview</Link><span className="border-b-2 border-foreground pb-3">Trade</span><a href="#pools" className="pb-3 text-muted-foreground">Liquidity pools</a></nav>
    <RuledPanel><Trajectory label="Launch to market" active={2} steps={[{label:'Launch'},{label:'Allocation'},{label:'Trading'},{label:'Claim schedule'}]} /></RuledPanel>
    <StatBar columns={5}><Stat label="Price" value={token.price} hint={`${token.change} · 7d`} /><Stat label="Liquidity · 4 sources" value="$1.84M" hint="Across Stellar DEX & Soroban" /><Stat label="Volume · 24h" value="$412,000" hint="1,208 trades" /><Stat label="Holders" value="6,812" hint="Trustlines with balance" /><Stat label="Circulating" value="42.0M" unit={token.ticker} hint="of 150M total supply" /></StatBar>
    <p className="font-mono text-2xs uppercase text-faint">Price is volume-weighted across sources · Illustrative market data · Not investment advice</p>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_384px]"><div className="flex min-w-0 flex-col gap-5"><InsetField><PriceChart ticker={token.ticker} price={token.price} series={priceSeriesByTimeframe(price)} /></InsetField><RuledPanel><div><h2 className="text-title font-semibold">Routes for 500 XLM → {token.ticker}</h2><p className="text-small text-muted-foreground">Illustrative quotes from available liquidity.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-small"><thead className="border-b font-mono text-2xs uppercase text-faint"><tr>{['Source','Type','You receive','Price impact',''].map(x=><th key={x} className="py-3">{x}</th>)}</tr></thead><tbody>{swapRoutes.map(route=><tr key={route.name} className={route.best ? 'bg-accent' : 'border-b'}><td className="p-3"><b>{route.name}</b><span className="block text-muted-foreground">{route.detail}</span></td><td>{route.type}</td><td>{route.output} {token.ticker}</td><td>{route.impact}</td><td>{route.best ? <Badge variant="live">Best output</Badge> : 'Use'}</td></tr>)}</tbody></table></div></RuledPanel></div><SwapPanel slug={slug} name={token.name} ticker={token.ticker} priceUsd={price} /></div>
    <div id="pools"><PoolTable name={token.name} ticker={token.ticker} /></div>
  </div>
}
