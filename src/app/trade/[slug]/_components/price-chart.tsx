'use client'

import { useState } from 'react'
import { LineChart } from '@/components/charts'
import { Label } from '@/components/stat'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import type { ChartTimeframe, PriceSeries } from '../_data'

const timeframes: ChartTimeframe[] = ['1D', '1W', '1M', '3M', 'ALL']

export function PriceChart({
  ticker,
  price,
  series,
  quoteSymbol = 'USD',
}: {
  ticker: string
  price: string
  series?: Record<ChartTimeframe, PriceSeries>
  quoteSymbol?: string
}) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('3M')
  const current = series?.[timeframe]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label>{ticker} / {quoteSymbol}</Label>
          <div className="flex items-baseline gap-2.5">
            <span className="text-big font-semibold tracking-[-0.03em] tabular-nums">{price}</span>
            {current && <span className="text-small text-ok">{current.change}</span>}
          </div>
        </div>
        <ToggleGroup
          aria-label="Chart timeframe"
          value={[timeframe]}
          onValueChange={(values) => {
            const [next] = values
            if (next) setTimeframe(next as ChartTimeframe)
          }}
          className="font-mono"
        >
          {timeframes.map((option) => (
            <ToggleGroupItem key={option} value={option} disabled={!series} className="font-mono text-meta">
              {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mt-6">
        {current ? <LineChart
          data={current.data}
          height={280}
          min={current.min}
          max={current.max}
          yTicks={current.yTicks}
          xLabels={current.xLabels}
          formatTick={(value) => `$${value.toFixed(2)}`}
          label={`${ticker} price over ${timeframe}`}
        /> : <Empty className="min-h-60">
          <EmptyHeader>
            <EmptyTitle>Price history unavailable</EmptyTitle>
            <EmptyDescription>The contract provides the current price. Historical prices are not connected.</EmptyDescription>
          </EmptyHeader>
        </Empty>}
      </div>
    </>
  )
}
