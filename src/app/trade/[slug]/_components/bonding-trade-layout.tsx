'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { formatAmount, type Snapshot, type Tokens } from '@/app/launch/[slug]/_bonding/contract'
import { BackLink, ProjectHeading } from '@/components/page-header'
import { Blockie } from '@/components/blockie'
import { Stat, StatBar } from '@/components/stat'
import { InsetField, RuledPanel, Trajectory } from '@/components/visual-system'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CopyIssuerButton, FollowButton } from './trade-actions'
import { PriceChart } from './price-chart'
import { PoolTable } from './pool-table'

type Props = {
  address: string
  snapshot?: Snapshot
  tokens?: Tokens
  loading: boolean
  refreshAction: ReactNode
  feedback: ReactNode
  wallet: ReactNode
  buy: ReactNode
  sell: ReactNode
  details: ReactNode
}

export function BondingTradeLayout({ address, snapshot, tokens, loading, refreshAction, feedback, wallet, buy, sell, details }: Props) {
  const params = snapshot?.config.params
  const name = params?.metadata.name || 'Bonding curve launch'
  const ticker = tokens?.assetSymbol || params?.metadata.symbol || 'Token'
  const pair = tokens ? (tokens.pair.isNative() ? 'XLM' : tokens.pairSymbol) : 'Pair token'
  const issuer = tokens?.asset.getIssuer()
  const target = params?.curve.graduation_target
  const progress = snapshot && target && target > BigInt(0)
    ? Number(snapshot.state.quote_reserve * BigInt(10_000) / target) / 100 : 0
  const canBuy = snapshot && !snapshot.state.busy && snapshot.status === 'Open' && snapshot.state.sold < snapshot.config.buckets.curve
  const canSell = snapshot && !snapshot.state.busy && (snapshot.status === 'Open' || snapshot.status === 'Failed') && snapshot.state.sold > BigInt(0)
  const routeStatus = !snapshot ? loading ? 'Loading' : 'Unavailable' : canBuy && canSell ? 'Available' : canBuy ? 'Buy only' : canSell ? 'Sell-back only' : 'Unavailable'

  return <div className="flex min-w-0 flex-col gap-6">
    <BackLink href="/">Discover</BackLink>
    <RuledPanel>
      <ProjectHeading
        mark={<Blockie seed={params?.asset || address} size={56} radius={16} />}
        title={name}
        meta={<><Badge variant="tag">{ticker}</Badge><Badge variant="soft"><Activity />{snapshot?.status || (loading ? 'Loading' : 'Unavailable')}</Badge><Badge variant="net" size="sm">Testnet</Badge></>}
        description={<span className="text-small text-muted-foreground">Bonding curve · {ticker} / {pair}</span>}
        actions={<><FollowButton name={name} />{issuer && <CopyIssuerButton issuer={issuer} />}{refreshAction}</>}
      />
    </RuledPanel>
    <nav aria-label="Token navigation" className="flex gap-6 overflow-x-auto border-b text-ui font-medium">
      <Link href={`/launch/${address}`} className="pb-3 text-muted-foreground">Overview</Link>
      <span aria-current="page" className="border-b-2 border-foreground pb-3">Trade</span>
      <a href="#pools" className="pb-3 text-muted-foreground">Liquidity pools</a>
      <a href="#launch-details" className="pb-3 text-muted-foreground">Launch details</a>
    </nav>
    {feedback}
    <RuledPanel>
      <Trajectory label="Launch to market" active={!snapshot || snapshot.status === 'Scheduled' ? 0 : snapshot.status === 'Graduated' ? 2 : 1}
        steps={[{ label: 'Launch' }, { label: 'Curve trading', detail: snapshot?.status }, { label: 'Graduation' }, { label: 'Pool settlement', detail: 'Not implemented' }]} />
    </RuledPanel>
    <StatBar columns={5}>
      <Stat label="Price" value={<span className="block break-words text-lg sm:text-stat">{snapshot ? formatAmount(snapshot.price) : '—'}</span>} unit={snapshot ? <span className="block">{pair}</span> : undefined} hint="Current curve price · before fee" />
      <Stat label="Liquidity" value="—" hint="Pool data unavailable" />
      <Stat label="Volume · 24h" value="—" hint="Trade history unavailable" />
      <Stat label="Holders" value="—" hint="Holder data unavailable" />
      <Stat label="Circulating" value="—" hint={snapshot ? `${formatAmount(snapshot.config.total_supply)} ${ticker} total supply` : 'Loading supply…'} />
    </StatBar>
    <p className="font-mono text-2xs uppercase text-faint">Live contract data · Stellar Testnet · Refreshes every 15 seconds</p>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_384px]">
      <div className="flex min-w-0 flex-col gap-5">
        <InsetField>
          {snapshot && tokens ? <PriceChart ticker={ticker} quoteSymbol={pair} price={`${formatAmount(snapshot.price)} ${pair}`} /> : loading ? <Skeleton className="h-80 w-full" /> : <p className="text-small text-muted-foreground">Price unavailable until contract and token data can be verified.</p>}
        </InsetField>
        {snapshot && <RuledPanel>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-title font-semibold">Graduation progress</h2>
            <span className="font-mono text-small tabular-nums">{progress.toFixed(2)}%</span>
          </div>
          <Progress className="mt-4" size="thick" tone="lime" value={Math.min(progress, 100)} aria-label={`${progress.toFixed(2)}% of graduation target`} />
          <dl className="mt-4 grid grid-cols-2 gap-4 text-small">
            <div><dt className="text-muted-foreground">Net reserves / target</dt><dd className="mt-1 break-words font-semibold tabular-nums">{formatAmount(snapshot.state.quote_reserve)} / {formatAmount(target ?? BigInt(0))} {pair}</dd></div>
            <div><dt className="text-muted-foreground">Distinct buyers</dt><dd className="mt-1 font-semibold tabular-nums">{snapshot.buyers.toString()}</dd></div>
            <div><dt className="text-muted-foreground">Net tokens sold</dt><dd className="mt-1 font-semibold tabular-nums">{formatAmount(snapshot.state.sold)} {ticker}</dd></div>
            <div><dt className="text-muted-foreground">Curve inventory</dt><dd className="mt-1 font-semibold tabular-nums">{formatAmount(snapshot.config.buckets.curve - snapshot.state.sold)} {ticker}</dd></div>
          </dl>
        </RuledPanel>}
        <RuledPanel>
          <h2 className="text-title font-semibold">Trading routes</h2>
          <p className="mt-1 text-small text-muted-foreground">Direct {ticker} / {pair} quotes are shown in the buy and sell form.</p>
          <Table className="mt-3">
            <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>You receive</TableHead><TableHead>Price impact</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody><TableRow>
              <TableCell><span className="font-semibold">Launch contract</span><span className="block text-muted-foreground">{ticker} / {pair}</span></TableCell>
              <TableCell>Bonding curve</TableCell><TableCell>See quote</TableCell><TableCell>—</TableCell>
              <TableCell><Badge variant="soft">{routeStatus}</Badge></TableCell>
            </TableRow></TableBody>
          </Table>
        </RuledPanel>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader><CardTitle>Swap</CardTitle><CardAction><Badge variant="net" size="sm">Testnet</Badge></CardAction></CardHeader>
          <CardContent>
            {snapshot && tokens ? <Tabs defaultValue="buy">
              <TabsList aria-label="Trade direction"><TabsTrigger value="buy">Buy</TabsTrigger><TabsTrigger value="sell">Sell</TabsTrigger></TabsList>
              <TabsContent value="buy" keepMounted className="pt-4">{buy}</TabsContent>
              <TabsContent value="sell" keepMounted className="pt-4">{sell}</TabsContent>
            </Tabs> : <p className="text-small text-muted-foreground">Trading requires verified token identities.</p>}
          </CardContent>
          <CardFooter><p className="text-small text-muted-foreground">Missing trustlines require a separate approval. Keep XLM for fees and reserves.</p></CardFooter>
        </Card>
        {wallet && <RuledPanel>{wallet}</RuledPanel>}
      </div>
    </div>
    <section id="pools" aria-label="Liquidity pools"><PoolTable ticker={ticker} unavailableReason="External pool data is not connected. This contract version does not create a pool or transfer graduation proceeds." /></section>
    <div id="launch-details" className="flex min-w-0 flex-col gap-8 border-t border-divider pt-6">
      <dl className="text-small"><dt className="text-muted-foreground">Launch contract</dt><dd className="mt-1 break-all font-mono">{address}</dd></dl>
      {details}
    </div>
  </div>
}
