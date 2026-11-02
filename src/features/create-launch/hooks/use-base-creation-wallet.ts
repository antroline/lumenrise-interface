'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBalance, useBytecode, useConnection, useDeployContract, useEstimateFeesPerGas, useEstimateGas, useReadContracts, useSimulateContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi, isAddress, isHex, type Abi, type Address, type Hash, type Hex } from 'viem';
import { launchTokenDeployment } from '@/lib/base/tokenDeployment';
import { useNetwork } from '@/lib/networks/context';
import { useLaunchpad } from '@/lib/launchpad';
import { sameEvmAddress } from '@/lib/base/wallet';
export type BaseCreationCall = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] };
type Command =
  | { kind: 'read'; calls: readonly BaseCreationCall[] }
  | { kind: 'code'; address: Address }
  | { kind: 'balance' }
  | { kind: 'estimate'; data: Hex; to?: Address }
  | { kind: 'simulate'; call: BaseCreationCall }
  | { kind: 'switch' }
  | { kind: 'write'; call: BaseCreationCall; onHash: (hash: Hash) => void }
  | { kind: 'deploy'; name: string; symbol: string; supply: bigint; onHash: (hash: Hash) => void }
  | { kind: 'receipt'; hash: Hash };
type Request = { id: number; command: Command; owner: Address; identity: string };
type Pending = Request & { resolve: (value: unknown) => void; reject: (error: Error) => void };
export function useBaseCreationWallet() {
  const account = useLaunchpad(), connection = useConnection();
  const { activeNetwork } = useNetwork();
  const chainId = activeNetwork.blockchain === 'base' ? activeNetwork.chainId : undefined;
  const networkName = activeNetwork.label;
  const owner = account.address && isAddress(account.address) ? account.address : undefined;
  const userId = account.account.status === 'registered' ? account.account.profile.userId : '';
  // Preserve existing Sepolia recovery identities while isolating Mainnet operations.
  const identity = `${userId}:${owner ?? ''}:${account.account.status}:${account.baseSigningSupported === true}${activeNetwork.apiNetwork === 'public' ? ':public' : ''}`;
  const latest = useRef({ identity, owner, connection });
  useLayoutEffect(() => { latest.current = { identity, owner, connection }; });
  const [request, setRequest] = useState<Request>();
  const pending = useRef<Pending | null>(null), sequence = useRef(0);
  const command = request?.command;
  const scopeKey = `base:${activeNetwork.apiNetwork}:creation:${request?.identity ?? identity}:${request?.id ?? 0}`;
  const query = { retry: false, gcTime: 0, staleTime: 0 } as const;
  const reads = useReadContracts({ contracts: command?.kind === 'read' ? command.calls.map(call => ({ ...call, chainId })) : [], allowFailure: false,
    scopeKey, query: { ...query, enabled: command?.kind === 'read' } });
  const code = useBytecode({ chainId, address: command?.kind === 'code' ? command.address : undefined, scopeKey, query: { ...query, enabled: command?.kind === 'code' } });
  const balance = useBalance({ chainId, address: request?.owner, scopeKey, query: { ...query, enabled: command?.kind === 'balance' } });
  const gas = useEstimateGas({ chainId, account: request?.owner, to: command?.kind === 'estimate' ? command.to : undefined,
    data: command?.kind === 'estimate' ? command.data : undefined, scopeKey, query: { ...query, enabled: command?.kind === 'estimate' } });
  const fees = useEstimateFeesPerGas({ chainId, scopeKey, query: { ...query, enabled: command?.kind === 'estimate' } });
  const simulated = useSimulateContract({ chainId, account: request?.owner,
    ...(command?.kind === 'simulate' ? command.call : { abi: erc20Abi, functionName: 'approve', address: undefined }),
    scopeKey, query: { ...query, enabled: command?.kind === 'simulate' } });
  const receipt = useWaitForTransactionReceipt({ chainId, hash: command?.kind === 'receipt' ? command.hash : undefined, confirmations: 1, timeout: 180000,
    query: { ...query, enabled: command?.kind === 'receipt' } });
  const { mutateAsync: write } = useWriteContract();
  const { mutateAsync: deploy } = useDeployContract();
  const { mutateAsync: switchChain } = useSwitchChain();
  function settle(value: unknown, error?: Error) {
    const current = pending.current;
    if (!current || current.id !== request?.id) return;
    pending.current = null; setRequest(undefined);
    if (error) current.reject(error); else current.resolve(value);
  }
  useEffect(() => {
    if (!request || !command) return;
    if (request.identity !== identity) { settle(undefined, new Error('The selected network or account changed. Resume on the original network.')); return; }
    const required = command.kind === 'read' ? [reads] : command.kind === 'code' ? [code] : command.kind === 'balance' ? [balance]
      : command.kind === 'estimate' ? [gas, fees] : command.kind === 'simulate' ? [simulated] : command.kind === 'receipt' ? [receipt] : [];
    const failed = required.find(result => result.isError);
    if (failed?.error) { settle(undefined, failed.error); return; }
    if (!required.length || !required.every(result => result.isSuccess)) return;
    if (command.kind === 'read') settle(reads.data);
    else if (command.kind === 'code') settle(code.data);
    else if (command.kind === 'balance') settle(balance.data?.value);
    else if (command.kind === 'estimate') {
      const price = fees.data?.maxFeePerGas ?? fees.data?.gasPrice;
      if (gas.data === undefined || price === undefined) settle(undefined, new Error('Network gas could not be estimated.'));
      else settle((gas.data * price * BigInt(120) + BigInt(99)) / BigInt(100));
    } else if (command.kind === 'simulate') settle(simulated.data?.result);
    else if (command.kind === 'receipt') settle(receipt.data);
  });
  const started = useRef(new Set<number>());
  useEffect(() => {
    if (!request || !command || !['write', 'deploy', 'switch'].includes(command.kind) || started.current.has(request.id)) return;
    started.current.add(request.id);
    const selected = request;
    async function run() {
      if (chainId === undefined) throw new Error('Select a Base network before launching.');
      const current = latest.current;
      if (current.identity !== selected.identity || !current.connection.connector || !current.connection.address || !sameEvmAddress(current.connection.address, selected.owner)) throw new Error('Your linked wallet or account changed. Review the launch again.');
      const connector = current.connection.connector;
      if (command!.kind === 'switch') {
        if (await connector.getChainId() !== chainId) await switchChain({ chainId });
        if (latest.current.identity !== selected.identity || await connector.getChainId() !== chainId) throw new Error(`The wallet could not switch to ${networkName}.`);
        return;
      }
      if (await connector.getChainId() !== chainId || latest.current.identity !== selected.identity) throw new Error(`The wallet must be on ${networkName} before signing.`);
      if (command!.kind === 'deploy') {
        const hash = await deploy({ abi: launchTokenDeployment.abi, bytecode: launchTokenDeployment.bytecode, args: [command!.name, command!.symbol, command!.supply, selected.owner], account: selected.owner, chainId });
        command!.onHash(hash); return hash;
      }
      if (command!.kind === 'write') {
        const hash = await write({ ...command!.call, account: selected.owner, chainId });
        command!.onHash(hash); return hash;
      }
    }
    void run().then(value => settle(value), error => settle(undefined, error instanceof Error ? error : new Error('The wallet request failed.')));
  });
  useEffect(() => () => { pending.current?.reject(new Error('Launch tracking was interrupted. Resume the saved transaction before signing again.')); pending.current = null; }, []);
  function execute(command: Command): Promise<unknown> {
    const current = latest.current;
    if (chainId === undefined) return Promise.reject(new Error('Select a Base network before launching.'));
    if (!current.owner || !userId) return Promise.reject(new Error('Finish signing in and registering your Base account first.'));
    if (pending.current) return Promise.reject(new Error('A wallet operation is already pending.'));
    return new Promise((resolve, reject) => {
      const next = { id: ++sequence.current, command, owner: current.owner!, identity: current.identity };
      pending.current = { ...next, resolve, reject }; setRequest(next);
    });
  }
  return {
    identity, owner,
    async ensureChain() { await execute({ kind: 'switch' }); },
    async read(calls: readonly BaseCreationCall[]) { const value = await execute({ kind: 'read', calls }); if (!Array.isArray(value)) throw new Error('Contract reads are unavailable.'); return value as unknown[]; },
    async code(address: Address) {
      const value = await execute({ kind: 'code', address });
      // wagmi's query normalizes viem's undefined (an address without code) to null.
      if (value === null || value === undefined || value === '0x') return undefined;
      if (typeof value !== 'string' || !isHex(value)) throw new Error('Invalid deployed bytecode.');
      return value;
    },
    async gasBalance() { const value = await execute({ kind: 'balance' }); if (typeof value !== 'bigint') throw new Error('ETH balance is unavailable.'); return value; },
    async estimate(data: Hex, to?: Address) { const value = await execute({ kind: 'estimate', data, to }); if (typeof value !== 'bigint') throw new Error('Gas estimate is unavailable.'); return value; },
    simulate: (call: BaseCreationCall) => execute({ kind: 'simulate', call }),
    write: (call: BaseCreationCall, onHash: (hash: Hash) => void) => execute({ kind: 'write', call, onHash }),
    deploy: (name: string, symbol: string, supply: bigint, onHash: (hash: Hash) => void) => execute({ kind: 'deploy', name, symbol, supply, onHash }),
    receipt: (hash: Hash) => execute({ kind: 'receipt', hash }),
  };
}
