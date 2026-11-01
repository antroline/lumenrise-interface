'use client';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { erc721Abi, type Address, type Hex } from 'viem';
import { getConfiguration } from '@/lib/api/config';
import type { LaunchResult } from '@/lib/api/launches/market';
import { launchAbi } from '@/lib/base/launchAbi';
import { graduationAbi, v4Abi, V4_DEPLOYMENTS, verifyPool, v4AssetPrice, type PoolKey } from '@/lib/base/uniswap-v4';
import { sameEvmAddress } from '@/lib/base/wallet';

export function useBaseV4Pool(launch: LaunchResult, enabled = true) {
  const chainId = launch.network === 'testnet' ? 84532 : 8453;
  const client = usePublicClient({ chainId });
  const deployment = V4_DEPLOYMENTS[chainId];
  const configuration = getConfiguration();
  const configured = 'chain' in configuration ? configuration.network.configurations[launch.network].uniswapV4 : undefined;
  const indexed = launch.pool;
  // Live price/liquidity snapshots change frequently; only execution identity belongs in the cache key.
  const indexedIdentity = indexed && {
    poolId: indexed.poolId, poolManager: indexed.poolManager, stateView: indexed.stateView, positionManager: indexed.positionManager,
    currency0: indexed.currency0, currency1: indexed.currency1, fee: indexed.fee, tickSpacing: indexed.tickSpacing, hooks: indexed.hooks,
  };
  const query = useQuery({
    queryKey: ['base-v4-pool', chainId, launch.contractId, launch.asset, launch.pair, launch.assetDecimals, launch.pairDecimals, configured, indexedIdentity],
    enabled: enabled && !!client && launch.assetDecimals !== undefined,
    retry: false, refetchInterval: 3000,
    queryFn: async () => {
      if (!client || launch.assetDecimals === undefined) throw new Error('Pool data is unavailable.');
      if (!configured) throw new Error('Uniswap V4 configuration is not available yet. Pool preparation will retry automatically.');
      if (!sameEvmAddress(configured.poolManager, deployment.manager) || !sameEvmAddress(configured.stateView, deployment.stateView) ||
          !sameEvmAddress(configured.positionManager, deployment.positions)) throw new Error('The configured Uniswap V4 deployment could not be verified.');
      const blockNumber = await client.getBlockNumber();
      const [graduation, state] = await Promise.all([
        client.readContract({ address: launch.contractId as Address, abi: graduationAbi, functionName: 'graduation_state', blockNumber }),
        client.readContract({ address: launch.contractId as Address, abi: launchAbi, functionName: 'get_state', blockNumber }),
      ]);
      if (!state.graduated || state.busy || !graduation.settled || !graduation.token_id || /^0x0+$/.test(graduation.pool_id))
        throw new Error('Preparing the Uniswap V4 pool. Settlement has not completed; checking again automatically.');
      let key: PoolKey;
      if (launch.pool) {
        const indexed = launch.pool;
        if (!sameEvmAddress(indexed.poolManager, configured.poolManager) || !sameEvmAddress(indexed.stateView, configured.stateView) ||
            !sameEvmAddress(indexed.positionManager, configured.positionManager) || indexed.poolId.toLowerCase() !== graduation.pool_id.toLowerCase())
          throw new Error('Indexed pool identity does not match the verified graduation. Refreshing pool information.');
        key = { currency0: indexed.currency0 as Address, currency1: indexed.currency1 as Address, fee: indexed.fee, tickSpacing: indexed.tickSpacing, hooks: indexed.hooks as Address };
      } else {
        // The index can lag settlement. Discover only this launch's verified position.
        const [position, owner] = await Promise.all([
          client.readContract({ address: deployment.positions, abi: v4Abi, functionName: 'getPoolAndPositionInfo', args: [graduation.token_id], blockNumber }),
          client.readContract({ address: deployment.positions, abi: erc721Abi, functionName: 'ownerOf', args: [graduation.token_id], blockNumber }),
        ]);
        if (!sameEvmAddress(owner, launch.contractId)) throw new Error('The graduation LP position could not be verified.');
        key = position[0];
      }
      verifyPool(key, graduation.pool_id as Hex, launch.asset as Address, launch.pair as Address);
      const [slot0, liquidity, ...managers] = await Promise.all([
        client.readContract({ address: deployment.stateView, abi: v4Abi, functionName: 'getSlot0', args: [graduation.pool_id], blockNumber }),
        client.readContract({ address: deployment.stateView, abi: v4Abi, functionName: 'getLiquidity', args: [graduation.pool_id], blockNumber }),
        ...[deployment.positions, deployment.stateView, deployment.quoter, deployment.router].map(address =>
          client.readContract({ address, abi: v4Abi, functionName: 'poolManager', blockNumber })),
      ]);
      if (managers.some(manager => !sameEvmAddress(manager, configured.poolManager))) throw new Error('The Uniswap contracts use a different PoolManager.');
      if (!liquidity || !slot0[0]) throw new Error('The pool has no active liquidity. Checking again automatically.');
      return { graduation, key, slot0, liquidity, price: v4AssetPrice(slot0[0], key, launch.asset as Address, launch.assetDecimals), blockNumber };
    },
  });
  return { ...query, client, chainId, deployment };
}
