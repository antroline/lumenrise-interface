'use client'

import { Label, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { toneFor } from '../_data/allocation-tones'

export type AllocationSlice = { key: string; name: string; share: number }

/**
 * Token distribution as a donut. The allocation table carries the same figures with the
 * same colour swatches, so this is the glanceable shape of the split rather than the only
 * record of it — hence no accessibility layer and no tab stops of its own.
 */
export function AllocationChart({ slices, forSale }: { slices: AllocationSlice[]; forSale: string }) {
  const colorByKey = Object.fromEntries(slices.map((slice, index) => [slice.key, toneFor(index).color]))
  const config: ChartConfig = {
    share: { label: 'Share' },
    ...Object.fromEntries(slices.map((slice, index) => [slice.key, { label: slice.name, color: toneFor(index).color }])),
  }
  // Each sector paints itself from the config token the table swatch uses.
  const data = slices.map((slice) => ({ ...slice, fill: `var(--color-${slice.key})` }))

  return (
    <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[240px]">
      <PieChart accessibilityLayer={false}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              nameKey="key"
              hideLabel
              formatter={(value, name, item) => {
                const key = String(name)
                return (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ background: item.fill ?? colorByKey[key] }}
                    />
                    <span className="flex flex-1 justify-between gap-5">
                      <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
                      <span className="font-medium text-foreground tabular-nums">{value}%</span>
                    </span>
                  </>
                )
              }}
            />
          }
        />
        <Pie
          data={data}
          dataKey="share"
          nameKey="key"
          innerRadius="60%"
          outerRadius="100%"
          paddingAngle={1.5}
          cornerRadius={3}
          strokeWidth={0}
          rootTabIndex={-1}
        >
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !('cx' in viewBox) || viewBox.cx == null || viewBox.cy == null) return null
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy - 2}
                    className="fill-foreground text-[26px] font-semibold tracking-[-0.02em] tabular-nums"
                  >
                    {forSale}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy + 18}
                    className="fill-muted-foreground text-[12px] font-medium tracking-[0.08em] uppercase"
                  >
                    for sale
                  </tspan>
                </text>
              )
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
