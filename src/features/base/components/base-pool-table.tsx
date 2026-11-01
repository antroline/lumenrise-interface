'use client';

import type { ReactNode } from 'react';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CopyAddress } from '@/features/launches/components/launch-project-links';
import { explorerUrl } from '@/lib/chain-address';
import type { LaunchResult } from '@/lib/api/launches/market';
import { pairLabel } from '@/lib/api/launches/display';
import { formatBaseAmount } from '@/lib/base/amount';
import { formatV4Price, graduationAbi } from '@/lib/base/uniswap-v4';
import { sameEvmAddress } from '@/lib/base/wallet';
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

  const { key, graduation, slot0, liquidity, blockNumber } = pool.data;
  const ticker = launch.metadata.symbol, pair = pairLabel(launch.pair, launch.network);
  const symbol = (currency: string) => sameEvmAddress(currency, launch.asset) ? ticker : pair;
  const assetIs0 = sameEvmAddress(key.currency0, launch.asset);
  const square = slot0[0] * slot0[0], q192 = BigInt(1) << BigInt(192);
  const price = formatV4Price(assetIs0 ? square : q192, assetIs0 ? q192 : square, launch.assetDecimals, launch.pairDecimals);
  const copy = (value: string, label: string) => <CopyAddress address={value} label={label} />;
  const contract = (value: string, label: string) => <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
    {copy(value, label)}
    <a href={explorerUrl(value, launch.network)} target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">BaseScan</a>
  </div>;
  const rows: [string, ReactNode][] = [
    ['Protocol', 'Uniswap V4'],
    ['Network', launch.network === 'testnet' ? 'Base Sepolia' : 'Base Mainnet'],
    ['Pair', `${ticker} / ${pair}`],
    ['Pool ID', copy(graduation.pool_id, 'pool ID')],
    ['PoolManager', contract(pool.deployment.manager, 'PoolManager')],
    ['LP NFT', <a key="position" href={explorerUrl(pool.deployment.positions, launch.network)} target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">#{graduation.token_id.toString()}</a>],
    [`Currency 0 · ${symbol(key.currency0)}`, contract(key.currency0, 'currency 0')],
    [`Currency 1 · ${symbol(key.currency1)}`, contract(key.currency1, 'currency 1')],
    ['Price', `1 ${ticker} ≈ ${price} ${pair}`],
    ['LP fee', `${formatBaseAmount(BigInt(slot0[3]), 4)}%`],
    ['Tick spacing', key.tickSpacing.toString()],
    ['Current tick', slot0[1].toString()],
    ['Active liquidity (L)', liquidity.toString()],
    ['Hooks', 'None'],
    [`${ticker} deposited at graduation`, `${formatBaseAmount(graduation.asset_deposited, launch.assetDecimals)} ${ticker}`],
    [`${pair} deposited at graduation`, `${formatBaseAmount(graduation.pair_deposited, launch.pairDecimals)} ${pair}`],
  ];
  return <section aria-label="Uniswap V4 liquidity pool" className="flex min-w-0 flex-col gap-3">
    {error && <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>Refresh failed. Showing the last verified pool snapshot.</span>
      <Button variant="outline" disabled={settlement.isFetching || pool.isFetching} onClick={() => void retry()}>Retry</Button>
    </div>}
    <Table>
      <caption className="sr-only">Verified Uniswap V4 pool details for {ticker}</caption>
      <TableHeader><TableRow><TableHead>Pool detail</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map(([label, value]) => <TableRow key={label}>
        <TableCell className="w-2/5 text-muted-foreground">{label}</TableCell>
        <TableCell className="break-all text-right tabular-nums">{value}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
    <p className="text-xs text-muted-foreground">Verified at block {blockNumber.toString()}. Graduation deposits are initial amounts, not current pool balances.</p>
  </section>;
}

function PoolNotice({ title, children }: { title: string; children: ReactNode }) {
  return <Empty><EmptyHeader><EmptyMedia><Droplets aria-hidden="true" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle>
    <EmptyDescription className="flex flex-col items-center gap-3">{children}</EmptyDescription>
  </EmptyHeader></Empty>;
}
