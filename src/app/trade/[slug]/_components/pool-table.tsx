'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { StellarIcon } from '@/components/brand-icons'
import { ProjectMark } from '@/components/project-mark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLaunchpad } from '@/lib/launchpad'
import { cn } from '@/lib/utils'
import type { ProjectMarkName } from '@/components/project-mark'
import { liquidityPools, type LiquidityPool } from '../_data'

type PoolFilter = 'all' | 'amm' | 'dex'

const filters: { value: PoolFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'amm', label: 'Soroban AMMs' },
  { value: 'dex', label: 'Stellar DEX' },
]

function matches(pool: LiquidityPool, filter: PoolFilter) {
  if (filter === 'amm') return pool.type.startsWith('AMM')
  if (filter === 'dex') return pool.type === 'Order book'
  return true
}

export function PoolTable({ name, ticker }: { name: ProjectMarkName; ticker: string }) {
  const { notify } = useLaunchpad()
  const [filter, setFilter] = useState<PoolFilter>('all')
  const pools = liquidityPools.filter((pool) => matches(pool, filter))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidity pools</CardTitle>
        <CardDescription>Pools that currently hold {ticker}. Data from each protocol’s contracts.</CardDescription>
        <CardAction>
          <ToggleGroup
            aria-label="Pool source"
            value={[filter]}
            onValueChange={(values) => {
              const [next] = values
              if (next) setFilter(next as PoolFilter)
            }}
          >
            {filters.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type · fee</TableHead>
            <TableHead className="text-right">Liquidity</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Volume 24h</TableHead>
            <TableHead className="hidden text-right md:table-cell">Share of liquidity</TableHead>
            <TableHead>
              <span className="sr-only">View</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.map((pool) => (
            <TableRow key={`${pool.source}-${pool.quote}`}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center">
                    <ProjectMark name={name} size={26} />
                    <span
                      aria-hidden="true"
                      className={cn(
                        '-ml-1.5 grid size-[26px] place-items-center rounded-full border-2 border-card',
                        pool.quote === 'XLM' ? 'bg-foreground text-background' : 'bg-border text-foreground',
                      )}
                    >
                      {pool.quote === 'XLM' ? <StellarIcon className="size-3.5" /> : <span className="text-3xs font-bold">$</span>}
                    </span>
                  </div>
                  <b className="font-semibold whitespace-nowrap">
                    {ticker} / {pool.quote}
                  </b>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{pool.source}</TableCell>
              <TableCell>
                <Badge variant="tag">{pool.type}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <b className="font-semibold tabular-nums">{pool.liquidity}</b>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{pool.volume}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center justify-end gap-2.5">
                  <Progress value={pool.share} aria-label={`Share of liquidity ${pool.share}%`} className="w-[100px]" />
                  <span className="w-8 font-mono text-xs tabular-nums">{pool.share}%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => notify('Pool analytics are not available in this preview.')}
                >
                  View
                  <ExternalLink data-icon="inline-end" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
