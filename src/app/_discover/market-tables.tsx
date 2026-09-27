import Link from 'next/link'
import { Check, RefreshCw } from 'lucide-react'
import { Sparkline } from '@/components/charts'
import { ProjectMark } from '@/components/project-mark'
import { StatusText } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { randomSeries } from '@/lib/chart'
import type { CompletedRaise, TradingToken } from '@/lib/data'
import { cn } from '@/lib/utils'

function TokenCell({ mark, title, subtitle }: { mark: TradingToken['name']; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <ProjectMark name={mark} size={30} />
      <div className="flex flex-col">
        <b className="font-semibold">{title}</b>
        <span className="font-mono text-caption text-faint">{subtitle}</span>
      </div>
    </div>
  )
}

export function RecentlyLaunchedTable({ tokens }: { tokens: TradingToken[] }) {
  return (
    <Card className="px-6 py-[18px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Launched</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="hidden text-right sm:table-cell">7d</TableHead>
            <TableHead>
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((token) => (
            <TableRow key={token.slug}>
              <TableCell>
                <TokenCell mark={token.name} title={token.name} subtitle={token.ticker} />
              </TableCell>
              <TableCell className="font-mono text-small">{token.launched}</TableCell>
              <TableCell className="text-right tabular-nums">
                <b className="font-semibold">{token.price}</b>
                <div className={cn('text-small', token.direction === 'up' ? 'text-ok' : 'text-bad')}>{token.change}</div>
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                <Sparkline
                  data={randomSeries(20, 5, token.direction === 'up' ? 0.2 : -0.15, 1.2, token.seed * 7)}
                  width={72}
                  height={26}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="xs" render={<Link href={`/trade/${token.slug}`} />} nativeButton={false}>
                  Trade
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export function CompletedTable({ raises }: { raises: CompletedRaise[] }) {
  return (
    <Card className="px-6 py-[18px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Raise</TableHead>
            <TableHead className="text-right">Raised</TableHead>
            <TableHead>Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {raises.map((raise) => (
            <TableRow key={raise.title}>
              <TableCell>
                <TokenCell mark={raise.mark} title={raise.title} subtitle={`${raise.date} · ${raise.participants} joined`} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{raise.raised}</TableCell>
              <TableCell>
                {raise.outcome === 'completed' ? (
                  <StatusText icon={Check}>Completed</StatusText>
                ) : (
                  <StatusText tone="warn" icon={RefreshCw}>
                    Refunded
                  </StatusText>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
