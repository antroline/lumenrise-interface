'use client';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useBalance, useBytecode, useEstimateGas, useEstimateFeesPerGas, useConnection, useReadContract, useSimulateContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { encodeFunctionData, erc20Abi, isAddress, type Hash, type TransactionReceipt } from 'viem';
import { useLaunchpad } from '@/lib/launchpad';
import { getApiBaseUrl } from '@/lib/api/client';
import { enqueueTrade, releaseTradeReceipt } from '@/lib/api/launches/trade-queue';
import { decodeBaseTradeEvents } from '@/lib/base/events';
import { launchAbi } from '@/lib/base/launchAbi';
import { parseBaseAmount, sellableBaseBalance } from '@/lib/base/amount';
import { canOriginateBaseTransaction, sameEvmAddress } from '@/lib/base/wallet';
import type { LaunchResult } from '@/lib/api/launches/market';
import type { TradeConfirmation } from '@/features/launches';
import type { TradeFormModel } from '@/features/launches';
import { useBaseLaunchReads } from './use-base-launch-reads';

const activeTrades = new Set<string>();

export function useBaseTradeForm(launch: LaunchResult, side: 'buy' | 'sell', locked: boolean, setLocked: (locked: boolean) => void, refresh: () => Promise<void>) {
  const { address, account, accountReady, baseSigningSupported } = useLaunchpad();
  const connection = useConnection();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const owner = address && isAddress(address) ? address : undefined;
  const userId = account.status === 'registered' ? account.profile.userId : undefined;
  const identity = `${userId ?? ''}:${owner ?? ''}:${account.status}`;
  const scopeKey = `base:${launch.network}:${identity}:${launch.contractId}`;
  const live = useBaseLaunchReads(launch, scopeKey);
  const { chainId, asset, pair, curve } = live;
  const buying = side === 'buy';
  const [entry, setEntry] = useState('');
  const [limitEntry, setLimitEntry] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [confirmation, setConfirmation] = useState<TradeConfirmation>();
  const [submittedHash, setSubmittedHash] = useState<Hash>();
  const [registrationNotice, setRegistrationNotice] = useState('');
  const [receiptHash, setReceiptHash] = useState<Hash>();
  const receiptWaiter = useRef<{ hash: Hash; resolve: (receipt: TransactionReceipt) => void; reject: (error: Error) => void } | null>(null);
  const running = useRef(false);
  const epoch = useRef<object>({});
  const latest = useRef({ identity, entry, limitEntry, connection, live, baseSigningSupported });
  useLayoutEffect(() => { latest.current = { identity, entry, limitEntry, connection, live, baseSigningSupported }; });
  useLayoutEffect(() => {
    epoch.current = {};
    return () => { epoch.current = {}; };
  }, [identity, connection.connector, connection.address]);
  useEffect(() => () => { receiptWaiter.current?.reject(new Error('Transaction tracking interrupted. Check its hash before trading again.')); }, []);
  const query = { enabled: !!owner && !!asset && !!pair && !!curve && accountReady, retry: false, refetchInterval: 3000 } as const;
  const held = useReadContract({ chainId, address: asset, abi: erc20Abi, functionName: 'balanceOf', args: owner ? [owner] : undefined, scopeKey, query });
  const pairHeld = useReadContract({ chainId, address: pair, abi: erc20Abi, functionName: 'balanceOf', args: owner ? [owner] : undefined, scopeKey, query });
  const rights = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: 'sellable_balance', args: owner ? [owner] : undefined, scopeKey, query });
  const allowance = useReadContract({ chainId, address: buying ? pair : asset, abi: erc20Abi, functionName: 'allowance', args: owner && curve ? [owner, curve] : undefined, scopeKey, query });
  const ownerCode = useBytecode({ chainId, address: owner, scopeKey, query });
  const gas = useBalance({ chainId, address: owner, scopeKey, query });
  let amount: bigint | undefined, inputError = '', limitError = '';
  const inputDecimals = buying ? launch.pairDecimals : launch.assetDecimals;
  try { if (entry && inputDecimals !== undefined) amount = parseBaseAmount(entry, inputDecimals); }
  catch (cause) { inputError = cause instanceof Error ? cause.message : 'Invalid amount.'; }
  const slippage = limitEntry.trim() || '0.5';
  let bps: bigint | undefined;
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(slippage)) limitError = 'Enter a slippage percentage with up to 2 decimal places.';
  else {
    const [whole, fraction = ''] = slippage.split('.');
    bps = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    if (bps >= BigInt(10000)) limitError = 'Slippage must be less than 100%.';
  }
  const permitted = !live.unavailable && inputDecimals !== undefined && (!owner || baseSigningSupported === true);
  const quoteRead = useReadContract({ chainId, address: curve, abi: launchAbi, functionName: buying ? 'quote_buy' : 'quote_sell', args: [amount ?? BigInt(0)], scopeKey,
    query: { enabled: permitted && amount !== undefined && !inputError, retry: false, refetchInterval: 3000 } });
  const quote = permitted && !quoteRead.isError && !quoteRead.isPlaceholderData ? quoteRead.data : undefined;
  const minimumReceived = quote && bps !== undefined && !limitError ? quote.amount_received * (BigInt(10000) - bps) / BigInt(10000) : undefined;
  const limit = buying ? minimumReceived === undefined ? undefined : amount : minimumReceived;
  const simulation = useSimulateContract({ chainId, address: curve, abi: launchAbi, functionName: side, account: owner,
    args: owner && amount !== undefined && minimumReceived !== undefined ? [owner, amount, minimumReceived] : undefined, scopeKey,
    query: { enabled: false, retry: false } });
  const approvalSimulation = useSimulateContract({ chainId, address: buying ? pair : asset, abi: erc20Abi, functionName: 'approve', account: owner,
    args: curve && amount !== undefined ? [curve, amount] : undefined, scopeKey, query: { enabled: false, retry: false } });
  const tradeGas = useEstimateGas({ chainId, account: owner, to: curve,
    data: owner && amount !== undefined && minimumReceived !== undefined ? encodeFunctionData({ abi: launchAbi, functionName: side, args: [owner, amount, minimumReceived] }) : undefined,
    scopeKey, query: { enabled: false, retry: false } });
  const approvalGas = useEstimateGas({ chainId, account: owner, to: buying ? pair : asset,
    data: curve && amount !== undefined ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [curve, amount] }) : undefined,
    scopeKey, query: { enabled: false, retry: false } });
  const fees = useEstimateFeesPerGas({ chainId, scopeKey, query: { enabled: false, retry: false } });
  const receipt = useWaitForTransactionReceipt({ chainId, hash: receiptHash, confirmations: 1, timeout: 180000,
    query: { enabled: !!receiptHash, retry: false } });
  useEffect(() => {
    const waiter = receiptWaiter.current;
    if (!waiter || waiter.hash !== receiptHash) return;
    if (receipt.isError) { receiptWaiter.current = null; waiter.reject(new Error('Confirmation is unavailable. Check the transaction hash before retrying.')); }
    else if (receipt.data) { receiptWaiter.current = null; waiter.resolve(receipt.data); }
  }, [receiptHash, receipt.data, receipt.isError]);
  function waitForReceipt(hash: Hash) {
    return new Promise<TransactionReceipt>((resolve, reject) => {
      receiptWaiter.current = { hash, resolve, reject }; setReceiptHash(hash);
    });
  }
  async function refreshWallet() {
    await Promise.all([held.refetch(), pairHeld.refetch(), rights.refetch(), allowance.refetch(), gas.refetch(), quoteRead.refetch(), refresh()]);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeTrades.has(scopeKey) || running.current || locked || submittedHash || !accountReady || !owner || !userId || !curve || !amount || !quote || minimumReceived === undefined || !permitted || limitError) return;
    const started = epoch.current, originalEntry = entry, originalSlippage = limitEntry;
    const origin = getApiBaseUrl();
    const context = { chain: 'base' as const, userId, apiBaseUrl: origin, awaitingReceipt: true };
    const expected = quote;
    const assertCurrent = () => {
      const current = latest.current;
      if (epoch.current !== started || current.identity !== identity || current.baseSigningSupported !== true || current.entry !== originalEntry || current.limitEntry !== originalSlippage ||
        !current.connection.address || !sameEvmAddress(current.connection.address, owner) || !current.connection.connector)
        throw new Error('Your wallet, account, or quote changed. Review the trade again.');
      return current.connection.connector;
    };
    async function verifyWalletChain() {
      const connector = assertCurrent();
      if (await connector.getChainId() !== chainId) throw new Error('The connected wallet is on the wrong Base network.');
      assertCurrent();
    }
    async function verifyGas(approval: boolean) {
      const [estimate, fee, balance] = await Promise.all([(approval ? approvalGas : tradeGas).refetch(), fees.refetch(), gas.refetch()]);
      assertCurrent();
      const gasPrice = fee.data?.maxFeePerGas ?? fee.data?.gasPrice;
      if (estimate.isError || fee.isError || balance.isError || estimate.data === undefined || gasPrice === undefined || !balance.data)
        throw new Error('Network gas could not be estimated. No transaction was submitted.');
      // Reserve a margin for changes between estimation and wallet confirmation.
      if (balance.data.value < (estimate.data * gasPrice * BigInt(120) + BigInt(99)) / BigInt(100))
        throw new Error('Insufficient Base Sepolia ETH for network gas.');
    }
    async function checkFundsAndQuote() {
      await latest.current.live.revalidate(); assertCurrent();
      const code = await ownerCode.refetch(); assertCurrent();
      if (code.isError) throw new Error('The signing account could not be verified.');
      if (!canOriginateBaseTransaction(code.data)) throw new Error('Smart-wallet transaction execution is not supported. Select a linked EOA wallet.');
      const [h, p, r, a, g, q] = await Promise.all([held.refetch(), pairHeld.refetch(), rights.refetch(), allowance.refetch(), gas.refetch(), quoteRead.refetch()]);
      assertCurrent();
      if ([h, p, r, a, g, q].some(result => result.isError) || h.data === undefined || p.data === undefined || r.data === undefined || a.data === undefined || !g.data || !q.data)
        throw new Error('Wallet balances, allowance, or the contract quote could not be verified.');
      if (g.data.value <= BigInt(0)) throw new Error('Fund this wallet with Base Sepolia ETH for network gas.');
      if (buying ? p.data < amount! : sellableBaseBalance(h.data, r.data) < amount!)
        throw new Error(buying ? 'Insufficient pair-token balance for the total payment.' : 'Insufficient asset balance or original-buyer sell rights.');
      if (q.data.gross !== expected.gross || q.data.creator_fee !== expected.creator_fee || q.data.amount_received !== expected.amount_received || q.data.user_amount !== expected.user_amount)
        throw new Error('The quote changed. Review the updated quote and retry.');
      return a.data;
    }
    activeTrades.add(scopeKey); running.current = true; setLocked(true); setWorking(true); setError(''); setConfirmation(undefined); setDialogOpen(true); setRegistrationNotice('');
    try {
      const connector = assertCurrent();
      if (await connector.getChainId() !== chainId) {
        setMessage('Switch to the selected Base network in your wallet…');
        await switchChainAsync({ chainId }); assertCurrent();
      }
      await verifyWalletChain();
      setMessage('Checking the current quote and your wallet…');
      const approved = await checkFundsAndQuote();
      if (approved < amount) {
        const simulated = await approvalSimulation.refetch(); assertCurrent(); await verifyWalletChain();
        if (simulated.isError || !simulated.data || simulated.data.result === false) throw new Error('Token approval simulation failed.');
        await verifyGas(true); await verifyWalletChain();
        setAwaitingApproval(true); setMessage(`Approve ${buying ? 'pair tokens' : 'asset tokens'} for this launch in your wallet…`);
        const approvalHash = await writeContractAsync({ ...simulated.data.request, chainId, account: owner });
        setAwaitingApproval(false); setMessage('Waiting for token approval confirmation…');
        const mined = await waitForReceipt(approvalHash);
        if (mined.status !== 'success') throw new Error('Token approval reverted. No trade was submitted.');
        await verifyWalletChain();
        if (await checkFundsAndQuote() < amount) throw new Error('Token allowance remains insufficient. No trade was submitted.');
      }
      await verifyWalletChain();
      const simulated = await simulation.refetch(); assertCurrent();
      if (simulated.isError || !simulated.data) throw simulated.error ?? new Error('Trade simulation failed.');
      await verifyGas(false);
      // Simulation uses the actual caller, total input and net-output minimum; methods are nonpayable.
      await verifyWalletChain();
      setAwaitingApproval(true); setMessage(`Approve the ${side} transaction in your wallet…`);
      const hash = await writeContractAsync({ ...simulated.data.request, chainId, account: owner });
      setSubmittedHash(hash); setAwaitingApproval(false);
      if (!enqueueTrade(launch.network, launch.contractId, hash, owner, launch.slug ?? undefined, context))
        setRegistrationNotice('The transaction was submitted, but activity recovery could not be saved. Keep its hash.');
      setMessage('Trade submitted. Waiting for mining and indexing…');
      let mined: TransactionReceipt;
      try { mined = await waitForReceipt(hash); }
      catch (error) { releaseTradeReceipt(launch.network, hash, context); throw error; }
      releaseTradeReceipt(launch.network, hash, context, mined.status !== 'success');
      if (mined.status !== 'success') { setSubmittedHash(undefined); throw new Error('The trade reverted on-chain.'); }
      const events = decodeBaseTradeEvents(mined.logs, curve, owner, launch.assetDecimals!);
      const executed = events.filter(event => event.side === side);
      if (!executed.length) throw new Error('The transaction mined, but its trade event could not be verified. Keep the hash and wait for indexing.');
      const assetAmount = executed.reduce((total, event) => total + event.amount, BigInt(0));
      setConfirmation({ hash, side, token: { symbol: launch.metadata.symbol, amount: assetAmount, decimals: launch.assetDecimals } });
      setMessage('Mined. Indexed activity may still be pending.'); setRegistrationNotice('Activity will update after indexing.'); setEntry('');
      await refreshWallet();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The transaction was rejected or could not be completed.');
    } finally { activeTrades.delete(scopeKey); running.current = false; setLocked(false); setWorking(false); setAwaitingApproval(false); }
  }
  const sellable = held.data !== undefined && rights.data !== undefined ? sellableBaseBalance(held.data, rights.data) : undefined;
  const model: TradeFormModel = {
    user: owner ? { address: owner } : undefined, isReady: accountReady && !!connection.connector,
    entry, setEntry, limitEntry, setLimitEntry, working, message, error, confirmation, dialogOpen, awaitingApproval,
    dismissConfirmation: () => { if (!working || submittedHash) setDialogOpen(false); },
    finishDialogClose: () => { if (!dialogOpen && !working && confirmation) { setSubmittedHash(undefined); setConfirmation(undefined); } },
    trustHash: undefined, registrationNotice, submittedHash, buying, pair: live.pairSymbol ?? 'Pair token', permitted: permitted && !submittedHash,
    inputError, amount, quote, quoteError: '', slippage, minimumReceived, limit, limitError, sellable, unavailable: owner && baseSigningSupported !== true ? 'Smart-wallet transaction execution is not supported. Select a linked EOA wallet.' : live.unavailable,
    quoteRead, submit,
  };
  return { model, price: live.price, balances: { held: held.data, pairHeld: pairHeld.data, position: rights.data }, refreshWallet };
}
