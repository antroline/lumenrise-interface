'use client';
import type { LaunchResult } from '@/lib/api/launches/market';
import { useQueryClient } from '@tanstack/react-query';
import { TradeFormView } from '@/features/launches';
import { launchKey } from '@/features/launches';
import { pairLabel } from '@/lib/api/launches/display';
import { useBaseTradeForm } from '../use-base-trade-form';
export function BaseTradeForm({ launch, side, locked, setLocked, quoteHost, active }: {
  launch: LaunchResult; side: 'buy' | 'sell'; locked: boolean; setLocked: (locked: boolean) => void; quoteHost: HTMLElement | null; active: boolean;
}) {
  const client = useQueryClient();
  async function refresh() {
    const chainId = launch.network === 'testnet' ? 84532 : 8453;
    await Promise.all([
      client.invalidateQueries({ queryKey: ['readContract', { chainId }] }),
      client.invalidateQueries({ queryKey: ['balance', { chainId }] }),
      client.invalidateQueries({ queryKey: launchKey(launch.network, launch.slug ?? '') }),
      client.invalidateQueries({ queryKey: ['launch-list', { chain: 'base', network: launch.network }] }),
    ]);
  }
  const trade = useBaseTradeForm(launch, side, locked, setLocked, refresh);
  const knownPair = pairLabel(launch.pair, launch.network);
  const model = knownPair === 'USDC' ? { ...trade.model, pair: knownPair } : trade.model;
  // Missing decimals block inputs and display unknown values; they never become signing units.
  if (launch.assetDecimals === undefined || launch.pairDecimals === undefined)
    return <p role="status">Token decimals are unavailable. Trading cannot be verified.</p>;
  return <TradeFormView model={model} scales={{ asset: launch.assetDecimals, pair: launch.pairDecimals }}
    address={launch.contractId} slug={launch.slug ?? undefined} network={launch.network} tokens={{ assetSymbol: launch.metadata.symbol }}
    snapshot={{ price: trade.price }} side={side} locked={locked} balances={trade.balances}
    tokenLogo={launch.metadata.logo} quoteHost={quoteHost} active={active} />;
}
