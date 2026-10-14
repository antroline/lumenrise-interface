'use client'

import { useState, type ReactNode } from 'react'
import { LineChart } from '@/components/charts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import type { ChartTimeframe, PriceSeries } from '../_data'

const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', 'ALL']

export function PriceChart({
  ticker,
  series,
  quoteSymbol = 'USD',
  history,
}: {
  ticker: string
  price: string
  series?: Record<ChartTimeframe, PriceSeries>
  quoteSymbol?: string
  history?: { range: ChartTimeframe; onRangeChange: (range: ChartTimeframe) => void; content: ReactNode }
}) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('3M')
  const selected = history?.range ?? timeframe
  const current = series?.[selected]

  return (
    <section aria-label="Price analysis" className="dark flex min-w-0 flex-col rounded-2xl bg-panel p-4 text-foreground sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-semibold">Price history</h2>
          <div className="flex flex-wrap items-baseline gap-2.5 text-small text-muted-foreground">
            <span>{ticker} / {quoteSymbol}</span>
            {current && <span className="text-small text-ok">{current.change}</span>}
          </div>
        </div>
        {(series || history) && <ToggleGroup
          aria-label="Chart timeframe"
          value={[selected]}
          onValueChange={(values) => {
            const [next] = values
            if (timeframes.includes(next as ChartTimeframe)) {
              if (history) history.onRangeChange(next as ChartTimeframe)
              else setTimeframe(next as ChartTimeframe)
            }
          }}
          className="flex-wrap"
        >
          {timeframes.map((option) => (
            <ToggleGroupItem key={option} value={option} disabled={!series && !history} className="min-h-10 text-meta">
              {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>}
      </div>
      <div className="mt-4 min-w-0">
        {history ? history.content : current ? <LineChart
          data={current.data}
          height={240}
          min={current.min}
          max={current.max}
          yTicks={current.yTicks}
          xLabels={current.xLabels}
          formatTick={(value) => `$${value.toFixed(2)}`}
          label={`${ticker} price over ${timeframe}`}
        /> : <Empty className="min-h-60">
          <EmptyHeader>
            <EmptyTitle>Price history unavailable</EmptyTitle>
            <EmptyDescription>There is no connected historical price source for this preview.</EmptyDescription>
          </EmptyHeader>
        </Empty>}
      </div>
    </section>
  )
}
