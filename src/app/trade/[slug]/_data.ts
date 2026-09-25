import { randomSeries } from '@/lib/chart'

// Illustrative market microstructure shared by every trading-token page. Only
// the header/price stats come from the token record; quotes and pools are mock
// content from the design spec.

export const XLM_BALANCE = 1240.5
export const XLM_USD = 0.3984
export const XLM_PER_TOKEN = 2.51
export const POOL_FEES_XLM = 0.24
export const NETWORK_FEE_XLM = 0.00012
export const PRICE_IMPACT = '0.18%'
export const BEST_ROUTE = 'Soroswap 60% · Aquarius 40%'

export const slippageOptions = ['0.1', '0.5', '1.0'] as const
export type Slippage = (typeof slippageOptions)[number]

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | 'ALL'

export type PriceSeries = {
  data: number[]
  xLabels: string[]
  min: number
  max: number
  yTicks: number[]
  change: string
}

const timeframeConfig: Record<ChartTimeframe, { points: number; start: number; drift: number; vol: number; seed: number; xLabels: string[]; change: string }> = {
  '1D': { points: 48, start: 0.53, drift: 0.0008, vol: 0.006, seed: 7, xLabels: ['00:00', '06:00', '12:00', '18:00', 'Now'], change: '+$0.0112 · 24h' },
  '1W': { points: 56, start: 0.47, drift: 0.002, vol: 0.012, seed: 11, xLabels: ['Sep 20', 'Sep 22', 'Sep 24', 'Sep 26'], change: '+$0.0521 · 7d' },
  '1M': { points: 60, start: 0.4, drift: 0.003, vol: 0.015, seed: 21, xLabels: ['Aug 27', 'Sep 02', 'Sep 10', 'Sep 18', 'Sep 26'], change: '+$0.0614 · 1 mo' },
  '3M': { points: 90, start: 0.44, drift: 0.0015, vol: 0.02, seed: 42, xLabels: ['Jul 01', 'Jul 24', 'Aug 16', 'Sep 02 · Launch', 'Sep 26'], change: '+$0.0987 · 3 mo' },
  ALL: { points: 120, start: 0.3, drift: 0.003, vol: 0.02, seed: 33, xLabels: ['Aug 27', 'Sep 02 · Launch', 'Sep 26'], change: '+$0.2410 · all' },
}

export function priceSeriesByTimeframe(price: number): Record<ChartTimeframe, PriceSeries> {
  const entries = Object.entries(timeframeConfig).map(([key, config]) => {
    const data = randomSeries(config.points, config.start, config.drift, config.vol, config.seed)
    data[data.length - 1] = price
    const lo = Math.min(...data)
    const hi = Math.max(...data)
    const pad = (hi - lo) * 0.15 || 0.01
    const min = Math.max(0, lo - pad)
    const max = hi + pad
    const step = (max - min) / 4
    const yTicks = [1, 2, 3, 4].map((i) => Math.round((min + step * i) * 100) / 100)
    const series: PriceSeries = { data, xLabels: config.xLabels, min, max, yTicks, change: config.change }
    return [key, series]
  })
  return Object.fromEntries(entries) as Record<ChartTimeframe, PriceSeries>
}

export type SwapRoute = {
  name: string
  detail: string
  type: 'AMM' | 'Order book'
  output: string
  impact: string
  best: boolean
}

export const swapRoutes: SwapRoute[] = [
  { name: 'Split route', detail: 'Soroswap 60% · Aquarius 40%', type: 'AMM', output: '199.21', impact: '0.18%', best: true },
  { name: 'Soroswap', detail: 'HBR / XLM pool', type: 'AMM', output: '198.64', impact: '0.41%', best: false },
  { name: 'Aquarius', detail: 'HBR / XLM pool', type: 'AMM', output: '198.02', impact: '0.63%', best: false },
  { name: 'Stellar DEX', detail: 'Native order book', type: 'Order book', output: '197.40', impact: '0.92%', best: false },
]

export type PoolQuote = 'XLM' | 'USDC'

export type LiquidityPool = {
  quote: PoolQuote
  source: string
  type: string
  liquidity: string
  volume: string
  share: number
}

export const liquidityPools: LiquidityPool[] = [
  { quote: 'XLM', source: 'Soroswap', type: 'AMM · 0.30%', liquidity: '$812,400', volume: '$186,200', share: 44 },
  { quote: 'USDC', source: 'Aquarius', type: 'AMM · 0.10%', liquidity: '$604,900', volume: '$141,030', share: 33 },
  { quote: 'XLM', source: 'Aquarius', type: 'AMM · 0.30%', liquidity: '$251,700', volume: '$48,900', share: 14 },
  { quote: 'USDC', source: 'Stellar DEX', type: 'Order book', liquidity: '$170,300', volume: '$35,870', share: 9 },
]
