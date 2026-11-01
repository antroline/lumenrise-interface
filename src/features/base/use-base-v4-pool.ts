'use client';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { erc721Abi, type Address } from 'viem';
import type { LaunchResult } from '@/lib/api/launches/market';
import { graduationAbi, v4Abi, V4_DEPLOYMENTS, verifyPool, v4AssetPrice } from '@/lib/base/uniswap-v4';
import { sameEvmAddress } from '@/lib/base/wallet';

export function useBaseV4Pool(launch: LaunchResult, enabled = true) {
  const chainId = launch.network === 'testnet' ? 84532 : 8453;
  const client = usePublicClient({ chainId });
  const deployment = V4_DEPLOYMENTS[chainId];
  const query = useQuery({
    queryKey: ['base-v4-pool', chainId, launch.contractId, launch.asset, launch.pair, launch.assetDecimals],
    enabled: enabled && !!client && launch.assetDecimals !== undefined,
    retry: false, refetchInterval: 3000,
    queryFn: async () => {
      if (!client || launch.assetDecimals === undefined) throw new Error('Pool data is unavailable.');
      const blockNumber = await client.getBlockNumber();
      const graduation = await client.readContract({ address: launch.contractId as Address, abi: graduationAbi, functionName: 'graduation_state', blockNumber });
      if (!graduation.settled || !graduation.token_id || /^0x0+$/.test(graduation.pool_id)) throw new Error('The graduated pool has not settled.');
      const [position, owner, slot0, liquidity, ...managers] = await Promise.all([
        client.readContract({ address: deployment.positions, abi: v4Abi, functionName: 'getPoolAndPositionInfo', args: [graduation.token_id], blockNumber }),
        client.readContract({ address: deployment.positions, abi: erc721Abi, functionName: 'ownerOf', args: [graduation.token_id], blockNumber }),
        client.readContract({ address: deployment.stateView, abi: v4Abi, functionName: 'getSlot0', args: [graduation.pool_id], blockNumber }),
        client.readContract({ address: deployment.stateView, abi: v4Abi, functionName: 'getLiquidity', args: [graduation.pool_id], blockNumber }),
        ...[deployment.positions, deployment.stateView, deployment.quoter, deployment.router].map(address =>
          client.readContract({ address, abi: v4Abi, functionName: 'poolManager', blockNumber })),
      ]);
      if (!sameEvmAddress(owner, launch.contractId) || managers.some(manager => !sameEvmAddress(manager, deployment.manager)))
        throw new Error('The LP position or Uniswap deployment could not be verified.');
      const key = position[0];
      verifyPool(key, graduation.pool_id, launch.asset as Address, launch.pair as Address);
      if (!liquidity || !slot0[0]) throw new Error('The pool has no active liquidity.');
      return { graduation, key, slot0, liquidity, price: v4AssetPrice(slot0[0], key, launch.asset as Address, launch.assetDecimals), blockNumber };
    },
  });
  return { ...query, client, chainId, deployment };
}
