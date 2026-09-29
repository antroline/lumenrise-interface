import { notFound } from 'next/navigation'
import { BackLink, ProjectHeading, SectionHeader } from '@/components/page-header'
import { ProjectMark } from '@/components/project-mark'
import { Stat, StatBar } from '@/components/stat'
import { StatusPill } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { InsetField, RuledPanel, SignalNode, Trajectory } from '@/components/visual-system'
import { getAuction } from '@/lib/data'
import { BidForm } from './bid-form'

const demand = [9.3, 8.5, 7.7, 7.0, 6.4, 5.8, 5.4, 5.0, 4.5, 4.1, 3.9, 3.6, 3.3, 2.9, 2.7, 2.5, 2.3, 2.1, 1.9, 1.7, 1.5]

export default async function AuctionRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const auction = getAuction(slug)
  if (!auction) notFound()

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Discover</BackLink>
      <ProjectHeading
        specimen={auction.name}
        mark={<ProjectMark name={auction.name} size={56} />}
        eyebrow="Auction"
        title={`${auction.name} token auction`}
        meta={<Badge variant="tag">{auction.ticker}</Badge>}
        actions={<><StatusPill status={auction.phase} /><Badge variant="tag-outline">{auction.model}</Badge><Badge variant="net">TESTNET</Badge></>}
      />
      <StatBar columns={5}>
        <Stat label="Tokens for sale" value={auction.supply.split(' ')[0]} hint={`${auction.ticker} · 16.2% of supply`} />
        <Stat label="Minimum bid" value={auction.minBid.split(' ')[0]} unit="USDC" hint={`Per ${auction.ticker}`} />
        <Stat label="Ends in" value="4d 06h 12m" hint={auction.time} />
        <Stat label="Clearing range · est." value={auction.range ? `${auction.range.low} – ${auction.range.high}` : 'Pending'} hint="USDC · from current bids" tone="highlight" />
        <Stat label="Bids" value="2,019" hint={auction.bidders} />
      </StatBar>
      <p className="text-small text-muted-foreground">Auction demand and balances are illustrative reference data. Contract bidding is not connected in this frontend.</p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <InsetField>
          <SectionHeader title="Demand by bid price" description="Tokens requested at or above each price. The clearing price is where demand meets supply." action={<span className="font-mono text-2xs text-faint">ILLUSTRATIVE</span>} />
          <div className="relative mt-4 flex h-64 items-end gap-1 border-b border-divider pb-2" role="img" aria-label="Illustrative demand chart, estimated clearing range 0.28 to 0.34 USDC">
            {demand.map((value, index) => <span key={index} className={`flex-1 rounded-t-sm ${index >= 9 && index <= 12 ? 'bg-lime' : index > 12 ? 'bg-border' : 'bg-foreground'}`} style={{ height: `${value * 9}%` }} />)}
            <span className="absolute inset-x-0 bottom-[34%] border-t border-dashed border-foreground" />
            <span className="absolute right-0 bottom-[34%] translate-y-1/2 border border-foreground bg-background px-1.5 py-0.5 font-mono text-2xs">CLEARING</span>
          </div>
          <div className="mt-2 flex justify-between font-mono text-2xs text-faint"><span>0.10</span><span>0.18</span><span>0.26</span><span>0.34</span><span>0.42</span><span>0.50</span></div>
          <div className="mt-5 flex items-center gap-3 border-t border-divider pt-3 font-mono text-2xs text-muted-foreground"><SignalNode active /><span>EST. CLEARING BAND</span><span className="ml-auto font-semibold text-foreground">{auction.range ? `${auction.range.low}–${auction.range.high}` : 'Pending'} USDC</span></div>
        </InsetField>
        <BidForm slug={slug} ticker={auction.ticker} minPrice={Number(auction.minBid.split(' ')[0])} open={auction.phase === 'live'} />
      </div>
      <RuledPanel>
        <SectionHeader title="Your bids" description="Positions are estimates until settlement. They move as other bids arrive." />
        <p className="text-small text-muted-foreground">Connect with Blux to view bids when auction contract data is available. The reference shows three illustrative bid positions.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-small"><thead className="border-b font-mono text-2xs uppercase text-faint"><tr>{['Bid', 'Price', 'Amount', 'Locked', 'Position', 'Placed'].map(label => <th key={label} className="py-3">{label}</th>)}</tr></thead><tbody>{[['#1', '0.32', '10,000', '3,200', 'In range · est.', 'Sep 24'], ['#2', '0.26', '6,000', '1,560', 'Below range · est.', 'Sep 25'], ['#3', '0.22', '4,000', 'Released', 'Cancelled', 'Sep 23']].map(row => <tr key={row[0]} className="border-b">{row.map((cell, index) => <td key={index} className="py-4">{cell}</td>)}</tr>)}</tbody></table></div>
      </RuledPanel>
      <RuledPanel>
        <SectionHeader title="How settlement works" description="Uniform-price batch auction" />
        <Trajectory label="Auction settlement stages" active={0} steps={[{ label: 'Auction ends' }, { label: 'Contract settles' }, { label: 'Claim & refunds' }]} />
        <div className="mt-5 grid gap-6 md:grid-cols-3">{[['Auction ends', 'New bids, updates and cancellations stop. All bids are final.'], ['Contract settles', 'The contract sorts bids by price, finds the clearing price and assigns allocations.'], ['Claim and refunds', 'Winning allocations become claimable. Unfilled USDC returns to your wallet.']].map(([title, copy]) => <div key={title} className="border-t border-divider pt-3"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-small text-muted-foreground">{copy}</p></div>)}</div>
      </RuledPanel>
    </div>
  )
}
