'use client';
import { useReadContract, useBytecode } from 'wagmi';
import { erc20Abi, isAddress, type Address, type ContractFunctionReturnType } from 'viem';
import { baseSepolia } from 'viem/chains';
import { factoryAbi } from '@/lib/base/factoryAbi';
import { launchAbi } from '@/lib/base/launchAbi';
import { sameEvmAddress } from '@/lib/base/wallet';
import { requireBaseWrites } from '@/lib/base/deployment';
import { getConfiguration } from '@/lib/api/config';
import type { LaunchResult } from '@/lib/api/launches/market';
export type BaseConfig = ContractFunctionReturnType<typeof launchAbi, 'view', 'get_config'>;
const address = (value?: string): Address | undefined => value && isAddress(value) ? value : undefined;
export function useBaseLaunchReads(launch: LaunchResult, scopeKey: string) {
  const chainId = launch.network === 'testnet' ? 84532 : 8453;
  const configuration = getConfiguration();
  const configured = 'chain' in configuration ? configuration.network.configurations[launch.network] : undefined;
  const factory = address(configured?.factoryContractId), curve = address(launch.contractId);
  const asset = address(launch.asset), pair = address(launch.pair);
  const query = { enabled: !!factory && !!curve && !!asset && !!pair, retry: false, refetchInterval: 3000 } as const;
  const config = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: 'get_config', scopeKey, query });
  const state = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: 'get_state', scopeKey, query });
  const status = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: 'status', scopeKey, query });
  const price = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: 'current_price', scopeKey, query });
  const settings = useReadContract({ chainId, address: factory, abi: factoryAbi, functionName: 'settings', scopeKey, query });
  const member = useReadContract({ chainId, address: factory, abi: factoryAbi, functionName: 'launch_at', args: [BigInt(launch.factoryIndex)], scopeKey, query });
  const assetDecimals = useReadContract({ chainId, address: asset, abi: erc20Abi, functionName: 'decimals', scopeKey, query });
  const pairDecimals = useReadContract({ chainId, address: pair, abi: erc20Abi, functionName: 'decimals', scopeKey, query });
  const pairSymbol = useReadContract({ chainId, address: pair, abi: erc20Abi, functionName: 'symbol', scopeKey, query });
  const factoryCode = useBytecode({ chainId, address: factory, scopeKey, query });
  const curveCode = useBytecode({ chainId, address: curve, scopeKey, query });
  const assetCode = useBytecode({ chainId, address: asset, scopeKey, query });
  const pairCode = useBytecode({ chainId, address: pair, scopeKey, query });
  // CHAINID executed on the RPC, independently of the configured transport's label.
  const rpcChain = useReadContract({ chainId, address: baseSepolia.contracts.multicall3.address,
    abi: [{ type: 'function', name: 'getChainId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'getChainId', scopeKey, query });
  const queries = { config, state, status, price, settings, member, assetDecimals, pairDecimals, factoryCode, curveCode, assetCode, pairCode, rpcChain };
  function verify(values: { [K in keyof typeof queries]: (typeof queries)[K]['data'] }) {
    requireBaseWrites('trading', launch.network);
    const c = values.config, s = values.settings;
    if (!configured?.launchConfigured || !factory || !curve || !asset || !pair || !c || !s ||
      values.rpcChain !== BigInt(chainId) || typeof values.price !== 'bigint' || values.price <= BigInt(0) ||
      [values.factoryCode, values.curveCode, values.assetCode, values.pairCode].some(code => !code || code === '0x') ||
      !sameEvmAddress(launch.factoryContractId, factory) || !sameEvmAddress(c.factory, factory) ||
      !values.member || !sameEvmAddress(values.member, curve) ||
      !sameEvmAddress(c.params.asset, asset) || !sameEvmAddress(c.params.pair, pair) ||
      !sameEvmAddress(c.params.owner, launch.owner) || !sameEvmAddress(s.pair, pair) ||
      !sameEvmAddress(c.platform, s.platform) || c.platform_fee_bps !== s.platform_fee_bps)
      throw new Error('The Base deployment, RPC chain, or launch configuration could not be verified.');
    if (launch.assetDecimals === undefined || launch.pairDecimals === undefined ||
      values.assetDecimals !== launch.assetDecimals || values.pairDecimals !== launch.pairDecimals ||
      values.assetDecimals < 0 || values.assetDecimals > 18 || values.pairDecimals < 0 || values.pairDecimals > 18)
      throw new Error('Indexed and on-chain token decimals must match before trading.');
    if (values.status !== 1 || !values.state || values.state.busy || values.state.graduated)
      throw new Error(values.status === 0 ? 'Trading opens at the launch start.' : values.status === 2 ? 'Trading stops after graduation.' : 'Trading is temporarily unavailable.');
    return c;
  }
  let unavailable: string | undefined;
  try {
    if (Object.values(queries).some(q => q.isError)) throw new Error('Required on-chain data is outdated or unavailable.');
    verify({ config: config.data, state: state.data, status: status.data, price: price.data, settings: settings.data, member: member.data,
      assetDecimals: assetDecimals.data, pairDecimals: pairDecimals.data, factoryCode: factoryCode.data, curveCode: curveCode.data,
      assetCode: assetCode.data, pairCode: pairCode.data, rpcChain: rpcChain.data }); }
  catch (error) { unavailable = error instanceof Error ? error.message : 'Trading data is unavailable.'; }
  async function revalidate() {
    // Named results keep the ABI-inferred types intact.
    const [c, st, stat, pr, sett, mem, ad, pd, fc, cc, ac, pc, rpc] = await Promise.all([
      config.refetch(), state.refetch(), status.refetch(), price.refetch(), settings.refetch(), member.refetch(),
      assetDecimals.refetch(), pairDecimals.refetch(), factoryCode.refetch(), curveCode.refetch(), assetCode.refetch(), pairCode.refetch(), rpcChain.refetch(),
    ]);
    if ([c, st, stat, pr, sett, mem, ad, pd, fc, cc, ac, pc, rpc].some(q => q.isError)) throw new Error('Required on-chain data could not refresh.');
    return verify({ config: c.data, state: st.data, status: stat.data, price: pr.data, settings: sett.data, member: mem.data,
      assetDecimals: ad.data, pairDecimals: pd.data, factoryCode: fc.data, curveCode: cc.data, assetCode: ac.data, pairCode: pc.data, rpcChain: rpc.data });
  }
  return { chainId, curve, asset, pair, unavailable, revalidate, price: price.data, pairSymbol: pairSymbol.data };
}
