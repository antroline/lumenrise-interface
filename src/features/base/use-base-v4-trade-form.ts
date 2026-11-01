'use client';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnection, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { encodeFunctionData, erc20Abi, isAddress, type Address, type Hash, type Hex } from 'viem';
import { useLaunchpad } from '@/lib/launchpad';
import { getApiBaseUrl } from '@/lib/api/client';
import { enqueueTrade, releaseTradeReceipt } from '@/lib/api/launches/trade-queue';
import type { LaunchResult } from '@/lib/api/launches/market';
import type { TradeConfirmation, TradeFormModel } from '@/features/launches';
import { MAX_BASE_AMOUNT, parseBaseAmount } from '@/lib/base/amount';
import { canOriginateBaseTransaction, sameEvmAddress } from '@/lib/base/wallet';
import { encodeV4Swap, formatV4Price, PERMIT2, permit2Abi, poolId, v4Abi, v4ExecutedAmounts } from '@/lib/base/uniswap-v4';
import { useBaseLaunchReads } from './use-base-launch-reads';
import { useBaseV4Pool } from './use-base-v4-pool';
import type { BaseTradeInputs } from './use-base-trade-form';

const activeSwaps = new Set<string>();
export function useBaseV4TradeForm(launch: LaunchResult, side: 'buy' | 'sell', locked: boolean, setLocked: (value: boolean) => void, refresh: () => Promise<void>, inputs?: BaseTradeInputs) {
  const { address, account, accountReady, baseSigningSupported } = useLaunchpad();
  const connection = useConnection();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const owner = address && isAddress(address) ? address : undefined;
  const userId = account.status === 'registered' ? account.profile.userId : undefined;
  const scopeKey = `base:${launch.network}:${userId ?? ''}:${owner ?? ''}:${launch.contractId}`;
  const live = useBaseLaunchReads(launch, scopeKey, 'pool');
  const pool = useBaseV4Pool(launch);
  const { client, chainId, deployment } = pool;
  const buying = side === 'buy', input = buying ? live.pair : live.asset;
  const [localEntry, setLocalEntry] = useState(''), [localLimit, setLocalLimit] = useState('');
  const { entry, setEntry, limitEntry, setLimitEntry } = inputs ?? { entry: localEntry, setEntry: setLocalEntry, limitEntry: localLimit, setLimitEntry: setLocalLimit };
  const [working, setWorking] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false), [awaitingApproval, setAwaitingApproval] = useState(false);
  const [confirmation, setConfirmation] = useState<TradeConfirmation>(), [submittedHash, setSubmittedHash] = useState<Hash>();
  const [registrationNotice, setRegistrationNotice] = useState('');
  const latest = useRef({ scopeKey, entry, limitEntry, connection, accountReady, baseSigningSupported });
  const epoch = useRef<object>({});
  const running = useRef(false);
  useLayoutEffect(() => { latest.current = { scopeKey, entry, limitEntry, connection, accountReady, baseSigningSupported }; });
  useLayoutEffect(() => { epoch.current = {}; return () => { epoch.current = {}; }; }, [scopeKey, connection.connector, connection.address]);
  const query = { enabled: !!owner && !!live.asset && !!live.pair && accountReady, retry: false, refetchInterval: 3000 } as const;
  const held = useReadContract({ chainId, address: live.asset, abi: erc20Abi, functionName: 'balanceOf', args: owner ? [owner] : undefined, scopeKey, query });
  const pairHeld = useReadContract({ chainId, address: live.pair, abi: erc20Abi, functionName: 'balanceOf', args: owner ? [owner] : undefined, scopeKey, query });
  let amount: bigint | undefined, inputError = '', limitError = '';
  try {
    const decimals = buying ? launch.pairDecimals : launch.assetDecimals;
    if (entry && decimals !== undefined) amount = parseBaseAmount(entry, decimals);
    if (amount !== undefined && amount > MAX_BASE_AMOUNT) { amount = undefined; inputError = 'This swap exceeds the Uniswap uint128 amount limit.'; }
  } catch (cause) { inputError = cause instanceof Error ? cause.message : 'Invalid amount.'; }
  const slippage = limitEntry.trim() || '0.5';
  let bps: bigint | undefined;
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(slippage)) limitError = 'Enter a slippage percentage with up to 2 decimal places.';
  else {
    const [whole, fraction = ''] = slippage.split('.');
    bps = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    if (bps >= BigInt(10000)) limitError = 'Slippage must be less than 100%.';
  }
  const unavailable = live.unavailable ?? (pool.isError ? pool.error.message : !pool.data ? 'Loading the graduated pool…' : undefined);
  const permitted = !unavailable && (!owner || baseSigningSupported === true);
  const quoteRead = useQuery({
    queryKey: ['base-v4-quote', scopeKey, pool.data ? poolId(pool.data.key) : '', input, amount?.toString()],
    enabled: permitted && !!client && !!pool.data && !!input && amount !== undefined,
    retry: false, refetchInterval: 3000,
    queryFn: async () => {
      if (!client || !pool.data || !input || amount === undefined) throw new Error('The swap quote is unavailable.');
      const result = await client.simulateContract({ address: deployment.quoter, abi: v4Abi, functionName: 'quoteExactInputSingle',
        args: [{ poolKey: pool.data.key, zeroForOne: sameEvmAddress(input, pool.data.key.currency0), exactAmount: amount, hookData: '0x' }] });
      const output = result.result[0];
      if (output <= BigInt(0) || output > MAX_BASE_AMOUNT) throw new Error('The pool cannot quote this amount.');
      // Pool fees are already included by the Quoter. Curve creator tax no longer applies.
      return { gross: buying ? amount : output, creator_fee: BigInt(0), user_amount: buying ? amount : output, amount_received: output };
    },
  });
  const quote = permitted && !quoteRead.isError && !quoteRead.isPlaceholderData ? quoteRead.data : undefined;
  const minimumReceived = quote && bps !== undefined && !limitError ? quote.amount_received * (BigInt(10000) - bps) / BigInt(10000) : undefined;
  if (minimumReceived === BigInt(0)) limitError = 'The minimum output rounds to zero. Increase the amount or reduce slippage.';

  async function refreshWallet() { await Promise.all([held.refetch(), pairHeld.refetch(), pool.refetch(), quoteRead.refetch(), refresh()]); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || activeSwaps.has(scopeKey) || locked || submittedHash || !accountReady || !userId || !owner || !input || !client || !amount || !quote || !minimumReceived || limitError || !permitted || !pool.data) return;
    const started = epoch.current, originalEntry = entry, originalLimit = limitEntry;
    const selectedPool = pool.data;
    const context = { chain: 'base' as const, userId, apiBaseUrl: getApiBaseUrl(), awaitingReceipt: true };
    function assertCurrent() {
      const current = latest.current;
      if (epoch.current !== started || current.scopeKey !== scopeKey || current.entry !== originalEntry || current.limitEntry !== originalLimit ||
        !current.accountReady || current.baseSigningSupported !== true || !current.connection.address || !sameEvmAddress(current.connection.address, owner!) || !current.connection.connector)
        throw new Error('Your wallet, account, or amount changed. Review the swap again.');
      return current.connection.connector;
    }
    async function verifyChain() {
      const connector = assertCurrent();
      if (await connector.getChainId() !== chainId) throw new Error('The wallet is on the wrong Base network.');
      assertCurrent();
    }
    async function verifyTrade() {
      await live.revalidate();
      const fresh = await pool.refetch();
      assertCurrent();
      if (fresh.isError || !fresh.data || fresh.data.graduation.pool_id !== selectedPool.graduation.pool_id ||
        fresh.data.graduation.token_id !== selectedPool.graduation.token_id || poolId(fresh.data.key) !== poolId(selectedPool.key))
        throw new Error('The graduated pool changed or could not be verified.');
      const [balance, code, freshQuote] = await Promise.all([
        client!.readContract({ address: input!, abi: erc20Abi, functionName: 'balanceOf', args: [owner!] }),
        client!.getBytecode({ address: owner! }), quoteRead.refetch(),
      ]);
      assertCurrent();
      if (!canOriginateBaseTransaction(code)) throw new Error('Select a linked EOA wallet to trade.');
      if (balance < amount!) throw new Error('Insufficient token balance.');
      if (freshQuote.isError || !freshQuote.data || freshQuote.data.amount_received < minimumReceived!) throw new Error('The price moved beyond your slippage limit. Review the updated quote.');
      await verifyChain();
    }
    async function send(to: Address, data: Hex, write: () => Promise<Hash>, label: string) {
      await verifyChain();
      const [estimated, fee, balance] = await Promise.all([
        client!.estimateGas({ account: owner!, to, data }), client!.estimateFeesPerGas(), client!.getBalance({ address: owner! }),
      ]);
      assertCurrent();
      const gasPrice = fee.maxFeePerGas ?? fee.gasPrice;
      if (gasPrice === undefined || balance < (estimated * gasPrice * BigInt(120) + BigInt(99)) / BigInt(100)) throw new Error('Insufficient ETH for network gas.');
      await verifyChain();
      setAwaitingApproval(true); setMessage(label);
      try { return await write(); } finally { setAwaitingApproval(false); }
    }
    async function wait(hash: Hash) {
      setMessage('Waiting for on-chain confirmation…');
      const mined = await client!.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180000 });
      if (mined.status !== 'success') throw new Error('The transaction reverted on-chain.');
      return mined;
    }
    activeSwaps.add(scopeKey); running.current = true; setLocked(true); setWorking(true); setDialogOpen(true); setError(''); setConfirmation(undefined); setRegistrationNotice('');
    try {
      const connector = assertCurrent();
      if (await connector.getChainId() !== chainId) { await switchChainAsync({ chainId }); assertCurrent(); }
      setMessage('Verifying the pool, quote and wallet…');
      await verifyTrade();
      const approved = await client.readContract({ address: input, abi: erc20Abi, functionName: 'allowance', args: [owner, PERMIT2] });
      if (approved < amount) {
        const request = { address: input, abi: erc20Abi, functionName: 'approve', args: [PERMIT2, amount], account: owner } as const;
        const simulated = await client.simulateContract(request);
        if (simulated.result === false) throw new Error('Token approval simulation failed.');
        const hash = await send(input, encodeFunctionData(request), () => writeContractAsync({ ...simulated.request, chainId }), 'Approve token spending by Uniswap Permit2…');
        await wait(hash); await verifyTrade();
        const allowance = await client.readContract({ address: input, abi: erc20Abi, functionName: 'allowance', args: [owner, PERMIT2] });
        if (allowance < amount) throw new Error('Token allowance remains insufficient.');
      }
      const authorization = await client.readContract({ address: PERMIT2, abi: permit2Abi, functionName: 'allowance', args: [owner, input, deployment.router] });
      const block = await client.getBlock();
      const expiration = Number(block.timestamp + BigInt(1200));
      if (authorization[0] < amount || BigInt(authorization[1]) < block.timestamp + BigInt(600)) {
        const request = { address: PERMIT2, abi: permit2Abi, functionName: 'approve', args: [input, deployment.router, amount, expiration], account: owner } as const;
        const simulated = await client.simulateContract(request);
        const hash = await send(PERMIT2, encodeFunctionData(request), () => writeContractAsync({ ...simulated.request, chainId }), 'Authorize this swap amount for the Uniswap router…');
        await wait(hash);
      }
      await verifyTrade();
      const deadline = (await client.getBlock()).timestamp + BigInt(600);
      const request = { address: deployment.router, abi: v4Abi, functionName: 'execute', account: owner,
        args: ['0x10', [encodeV4Swap(selectedPool.key, input, amount, minimumReceived)], deadline] } as const;
      const simulated = await client.simulateContract(request);
      const hash = await send(deployment.router, encodeFunctionData(request), () => writeContractAsync({ ...simulated.request, chainId }), 'Confirm the Uniswap V4 swap in your wallet…');
      setSubmittedHash(hash);
      if (!enqueueTrade(launch.network, launch.contractId, hash, owner, launch.slug ?? undefined, context)) setRegistrationNotice('Keep the transaction hash; activity recovery could not be saved.');
      let mined;
      try { mined = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180000 }); }
      catch (cause) { releaseTradeReceipt(launch.network, hash, context); throw cause; }
      releaseTradeReceipt(launch.network, hash, context, mined.status !== 'success');
      if (mined.status !== 'success') { setSubmittedHash(undefined); throw new Error('The swap reverted on-chain.'); }
      const executed = v4ExecutedAmounts(mined.logs, deployment.manager, deployment.router, selectedPool.graduation.pool_id, selectedPool.key, input);
      if (executed.paid > amount || executed.received < minimumReceived) throw new Error('Unexpected swap amounts. Keep the transaction hash.');
      setConfirmation({ hash, side, token: { symbol: launch.metadata.symbol, amount: buying ? executed.received : executed.paid, decimals: launch.assetDecimals } });
      setMessage('Swap confirmed on-chain.'); setRegistrationNotice('Pool activity will appear when supported by the indexer.'); setEntry('');
      await refreshWallet();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The swap could not be completed.'); }
    finally { activeSwaps.delete(scopeKey); running.current = false; setLocked(false); setWorking(false); setAwaitingApproval(false); }
  }
  const model: TradeFormModel = {
    user: owner ? { address: owner } : undefined, isReady: accountReady && !!connection.connector,
    entry, setEntry, limitEntry, setLimitEntry, working, message, error, confirmation, dialogOpen, awaitingApproval,
    dismissConfirmation: () => { if (!working || submittedHash) setDialogOpen(false); },
    finishDialogClose: () => { if (!dialogOpen && !working && confirmation) { setSubmittedHash(undefined); setConfirmation(undefined); } },
    trustHash: undefined, registrationNotice, submittedHash, buying, pair: live.pairSymbol ?? 'USDC', permitted: permitted && !submittedHash,
    inputError, amount, quote, quoteError: quoteRead.isError ? 'The pool quote is unavailable.' : '', slippage, minimumReceived,
    limit: buying ? minimumReceived === undefined ? undefined : amount : minimumReceived, limitError, sellable: held.data,
    unavailable: owner && baseSigningSupported !== true ? 'Select a linked EOA wallet to trade.' : unavailable, quoteRead, submit,
  };
  let priceLabel: string | undefined;
  if (!pool.isError && pool.data && launch.assetDecimals !== undefined && launch.pairDecimals !== undefined) {
    const square = pool.data.slot0[0] * pool.data.slot0[0], q192 = BigInt(1) << BigInt(192);
    const assetIs0 = sameEvmAddress(pool.data.key.currency0, launch.asset);
    priceLabel = quote && amount ? formatV4Price(buying ? amount : quote.amount_received, buying ? quote.amount_received : amount, launch.assetDecimals, launch.pairDecimals)
      : formatV4Price(assetIs0 ? square : q192, assetIs0 ? q192 : square, launch.assetDecimals, launch.pairDecimals);
  }
  return { model, price: pool.isError ? undefined : pool.data?.price, poolPricing: { label: priceLabel, lpFee: pool.data?.slot0[3] ?? 0 }, balances: { held: held.data, pairHeld: pairHeld.data, position: held.data }, refreshWallet };
}
