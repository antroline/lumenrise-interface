import { notFound } from 'next/navigation'
import { StrKey } from '@stellar/stellar-sdk'
import { BondingCurvePage } from '@/app/launch/[slug]/_bonding/bonding-curve-page'
import { ProjectMark } from '@/components/project-mark'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { getTradingToken } from '@/lib/data'
import { PoolTable } from './_components/pool-table'
import { PriceChart } from './_components/price-chart'
import { SwapPanel } from './_components/swap-panel'
import { FollowButton } from './_components/trade-actions'
import { TradePageTemplate } from './_components/trade-page-template'
import { TradeHeader } from './_components/trade-header'
import { TradeActivity } from './_components/trade-activity'
import { API_NETWORK } from '@/app/create/_launch/transactions'

export default async function TradePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ network?: string }> }) {
  const { slug } = await params
  const { network } = await searchParams
  if (StrKey.isValidContract(slug)) return <BondingCurvePage key={network + ':' + slug} address={slug} surface="trade" network={network === 'public' || network === 'mainnet' ? 'public' : API_NETWORK} />
  const token = getTradingToken(slug)
  if (!token) notFound()
  const price = Number(token.price.replace('$', ''))
  return <TradePageTemplate header={<>
    <TradeHeader mark={<ProjectMark name={token.name} size={64} />} name={token.name} ticker={token.ticker} pair="USD" overview="/"
      status={<><Badge variant="soft" size="sm">Illustrative preview</Badge><Badge variant="net" size="sm">Testnet</Badge></>}
      price={token.price} priceNote="Illustrative price" actions={<FollowButton name={token.name} />} metrics={<>{['24h volume', 'Liquidity', 'Holders'].map(label => <div key={label}><dt className="text-small text-muted-foreground">{label}</dt><dd className="mt-1 text-mid font-semibold">—</dd><span className="text-small text-muted-foreground">Not connected</span></div>)}</>} />
  </>} market={<PriceChart ticker={token.ticker} price={token.price} />}
    swap={<SwapPanel slug={slug} name={token.name} ticker={token.ticker} priceUsd={price} />}
    footer={<TradeActivity trades={<Empty><EmptyHeader><EmptyTitle>Trading activity unavailable</EmptyTitle><EmptyDescription>This preview has no connected trade history. Open a contract launch to view recorded trades.</EmptyDescription></EmptyHeader></Empty>} pools={<PoolTable name={token.name} ticker={token.ticker} />} />} />
}
