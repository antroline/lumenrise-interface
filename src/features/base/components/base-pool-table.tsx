'use client';

import type { ReactNode } from 'react';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LaunchResult } from '@/lib/api/launches/market';
import { pairLabel } from '@/lib/api/launches/display';
import { formatBaseAmount } from '@/lib/base/amount';
import { formatV4Price, graduationAbi } from '@/lib/base/uniswap-v4';
import { sameEvmAddress } from '@/lib/base/wallet';
import { tradeTableClass } from '@/features/launches/trading/trade-table-style';
import { useBaseV4Pool } from '../use-base-v4-pool';

export function BasePoolTable({ launch }: { launch: LaunchResult }) {
  const chainId = launch.network === 'testnet' ? 84532 : 8453;
  const address = isAddress(launch.contractId) ? launch.contractId : undefined;
  const settlement = useReadContract({ chainId, address, abi: graduationAbi, functionName: 'graduation_state',
    query: { enabled: !!address, retry: false, refetchInterval: 3000 } });
  const pool = useBaseV4Pool(launch, !!settlement.data?.settled);
  const error = settlement.isError ? settlement.error : pool.isError ? pool.error : undefined;
  async function retry() {
    const result = await settlement.refetch();
    if (result.data?.settled) await pool.refetch();
  }
  if (!address || launch.assetDecimals === undefined || launch.pairDecimals === undefined)
    return <PoolNotice title="Pool data unavailable">The token contract or decimals could not be verified.</PoolNotice>;
  if (error && (!pool.data || !settlement.data?.settled))
    return <PoolNotice title="Could not load the pool">
      {error.message}
      <Button variant="outline" disabled={settlement.isFetching || pool.isFetching} onClick={() => void retry()}>Retry</Button>
    </PoolNotice>;
  if (settlement.isPending || (settlement.data?.settled && !pool.data))
    return <div role="status" aria-label="Loading liquidity pool" aria-busy="true" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map(row => <Skeleton key={row} className="h-10 w-full motion-reduce:animate-none" />)}
    </div>;
  if (!settlement.data?.settled || !pool.data)
    return <PoolNotice title="Pool not created yet">The Uniswap V4 pool becomes available after this token graduates and settlement completes.</PoolNotice>;

  const { key, graduation, slot0 } = pool.data;
  const ticker = launch.metadata.symbol, pair = pairLabel(launch.pair, launch.network);
  const assetIs0 = sameEvmAddress(key.currency0, launch.asset);
  const square = slot0[0] * slot0[0], q192 = BigInt(1) << BigInt(192);
  const price = formatV4Price(assetIs0 ? square : q192, assetIs0 ? q192 : square, launch.assetDecimals, launch.pairDecimals);
  return <section aria-label="Uniswap V4 liquidity pool" className="flex min-w-0 flex-col gap-3">
    {error && <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>Refresh failed. Showing the last verified pool snapshot.</span>
      <Button variant="outline" disabled={settlement.isFetching || pool.isFetching} onClick={() => void retry()}>Retry</Button>
    </div>}
    <Table className={`${tradeTableClass} [&_th]:h-9 [&_th]:bg-muted [&_th]:py-2 [&_th]:text-xs [&_th]:font-medium [&_th]:normal-case [&_th]:tracking-normal [&_th]:text-muted-foreground [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg [&_tbody_td]:rounded-none`}>
      <caption className="sr-only">Verified Uniswap V4 pool details for {ticker}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Pool</TableHead>
          <TableHead scope="col" className="text-right">Price</TableHead>
          <TableHead scope="col" className="text-right">LP fee</TableHead>
          <TableHead scope="col" className="text-right">Initial {ticker}</TableHead>
          <TableHead scope="col" className="text-right">Initial {pair}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="whitespace-nowrap">
            <p className="font-medium">{ticker} / {pair}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uniswap V4 · {launch.network === 'testnet' ? 'Base Sepolia' : 'Base Mainnet'}
            </p>
          </TableCell>
          <TableCell className="text-right tabular-nums whitespace-nowrap">
            <span className="sr-only">1 {ticker} ≈ </span>{price} {pair}
          </TableCell>
          <TableCell className="text-right tabular-nums whitespace-nowrap">{formatPoolNumber(formatBaseAmount(BigInt(slot0[3]), 4))}%</TableCell>
          <TableCell className="text-right tabular-nums whitespace-nowrap">{formatPoolNumber(formatBaseAmount(graduation.asset_deposited, launch.assetDecimals))}</TableCell>
          <TableCell className="text-right tabular-nums whitespace-nowrap">{formatPoolNumber(formatBaseAmount(graduation.pair_deposited, launch.pairDecimals))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <p className="text-xs text-muted-foreground">Graduation deposits are initial amounts, not current pool balances.</p>
  </section>;
}

function formatPoolNumber(value: string): string {
  if (value.startsWith('<')) return '<0.001';
  const [whole, fraction = ''] = value.split('.');
  const thousand = BigInt(1000);
  const rounded = BigInt(whole) * thousand + BigInt(fraction.padEnd(3, '0').slice(0, 3))
    + (Number(fraction[3] ?? '0') >= 5 ? BigInt(1) : BigInt(0));
  if (rounded === BigInt(0) && /[1-9]/.test(value)) return '<0.001';
  return `${rounded / thousand}.${(rounded % thousand).toString().padStart(3, '0')}`;
}

function PoolNotice({ title, children }: { title: string; children: ReactNode }) {
  return <Empty><EmptyHeader><EmptyMedia><Droplets aria-hidden="true" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle>
    <EmptyDescription className="flex flex-col items-center gap-3">{children}</EmptyDescription>
  </EmptyHeader></Empty>;
}
