'use client';
import type { LaunchResult } from '@/lib/api/launches/market';
import { useQueryClient } from '@tanstack/react-query';
import { TradeFormView } from '@/features/launches';
import { launchKey } from '@/features/launches';
import { pairLabel } from '@/lib/api/launches/display';
import { useBaseTradeForm } from '../use-base-trade-form';
import { useBaseV4TradeForm } from '../use-base-v4-trade-form';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { graduationAbi } from '@/lib/base/uniswap-v4';
import { launchAbi } from '@/lib/base/launchAbi';
import { useState } from 'react';
import { useLaunchpad } from '@/lib/launchpad';
import type { BaseTradeInputs } from '../use-base-trade-form';
type Props = {
  launch: LaunchResult; side: 'buy' | 'sell'; onFlip?: () => void; locked: boolean; setLocked: (locked: boolean) => void; quoteHost: HTMLElement | null; active: boolean;
};
export function BaseTradeForm(props: Props) {
  const { address, account } = useLaunchpad();
  const identity = account.status === 'registered' ? account.profile.userId : account.status;
  return <BaseTradeRouter key={`${props.launch.network}:${props.launch.contractId}:${props.side}:${identity}:${address}`} {...props} />;
}
function BaseTradeRouter(props: Props) {
  const { launch } = props;
  const [entry, setEntry] = useState(''), [limitEntry, setLimitEntry] = useState('');
  const [poolRoute, setPoolRoute] = useState(false);
  const chainId = launch.network === 'testnet' ? 84532 : 8453;
  const address = isAddress(launch.contractId) ? launch.contractId : undefined;
  const query = { enabled: !!address, retry: false, refetchInterval: 3000 } as const;
  // Cache the complete settlement struct on load, including pre-graduation launches.
  const graduation = useReadContract({ chainId, address, abi: graduationAbi, functionName: 'graduation_state', query });
  const state = useReadContract({ chainId, address, abi: launchAbi, functionName: 'get_state', query });
  const graduated = graduation.data?.settled || state.data?.graduated || launch.state.graduated === true || launch.graduationState?.settled || launch.bonding?.state.graduated || launch.bonding?.status === 'Graduated';
  // Preserve entered amounts across graduation and never unmount an in-flight curve trade.
  if (graduated && !poolRoute && !props.locked) setPoolRoute(true);
  const inputs = { entry, setEntry, limitEntry, setLimitEntry };
  return poolRoute ? <BasePoolTradeForm {...props} inputs={inputs} /> : <BaseCurveTradeForm {...props} inputs={inputs} />;
}
function useRefreshLaunch(launch: LaunchResult) {
  const client = useQueryClient();
  async function refresh() {
    const chainId = launch.network === 'testnet' ? 84532 : 8453;
    await Promise.all([
      client.invalidateQueries({ queryKey: ['readContract', { chainId }] }),
      client.invalidateQueries({ queryKey: ['balance', { chainId }] }),
      client.invalidateQueries({ queryKey: ['base-v4-pool', chainId, launch.contractId] }),
      client.invalidateQueries({ queryKey: ['base-v4-quote'] }),
      client.invalidateQueries({ queryKey: launchKey(launch.network, launch.slug ?? '') }),
      client.invalidateQueries({ queryKey: ['launch-list', { chain: 'base', network: launch.network }] }),
    ]);
  }
  return refresh;
}
function BaseCurveTradeForm(props: Props & { inputs: BaseTradeInputs }) {
  const refresh = useRefreshLaunch(props.launch);
  const trade = useBaseTradeForm(props.launch, props.side, props.locked, props.setLocked, refresh, props.inputs);
  return <BaseTradePresentation {...props} trade={trade} />;
}
function BasePoolTradeForm(props: Props & { inputs: BaseTradeInputs }) {
  const refresh = useRefreshLaunch(props.launch);
  const trade = useBaseV4TradeForm(props.launch, props.side, props.locked, props.setLocked, refresh, props.inputs, props.active);
  return <BaseTradePresentation {...props} trade={trade} />;
}
function BaseTradePresentation({ launch, side, onFlip, locked, quoteHost, active, trade }: Props & { trade: ReturnType<typeof useBaseTradeForm> & { poolPricing?: ReturnType<typeof useBaseV4TradeForm>['poolPricing'] } }) {
  const knownPair = pairLabel(launch.pair, launch.network);
  const model = knownPair === 'USDC' ? { ...trade.model, pair: knownPair } : trade.model;
  // Missing decimals block inputs and display unknown values; they never become signing units.
  if (launch.assetDecimals === undefined || launch.pairDecimals === undefined)
    return <p role="status">Token decimals are unavailable. Trading cannot be verified.</p>;
  return <TradeFormView model={model} scales={{ asset: launch.assetDecimals, pair: launch.pairDecimals }} poolPricing={trade.poolPricing}
    address={launch.contractId} slug={launch.slug ?? undefined} network={launch.network} tokens={{ assetSymbol: launch.metadata.symbol }}
    snapshot={{ price: trade.price }} side={side} onFlip={onFlip} locked={locked} balances={trade.balances}
    tokenLogo={launch.metadata.logo} quoteHost={quoteHost} active={active} />;
}
