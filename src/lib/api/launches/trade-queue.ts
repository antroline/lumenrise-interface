import { ApiError, getApiBaseUrl, getApiUserId, getApiChain, getApiNetwork, type ApiChain } from '../client';
import { getConfiguration } from '../config';
import { confirmLaunch, getLaunchList, recordTrade } from './market';
import type { ApiNetwork } from './types';

const PREFIX = 'lumenrise:trade-registration:';
export const QUEUE_EVENT = 'lumenrise:trade-registration-changed';
export const REGISTERED_EVENT = 'lumenrise:transaction-registered';
export type ConfirmedLaunch = { slug: string; contractId: string };
export type QueuedTrade = {
  /** Legacy records without a chain belong to Stellar only. */
  chain?: ApiChain;
  action?: 'trade' | 'launch';
  network: ApiNetwork;
  contractId: string;
  slug?: string;
  transactionHash: string;
  traderAddress: string;
  userId: string | null;
  apiBaseUrl: string;
  attempts: number;
  nextAttemptAt: number;
  state: 'pending' | 'identity' | 'invalid';
  error?: string;
};
const inFlight = new Set<string>();
// A live signer owns receipt tracking until it completes. After reload the server
// verifies the saved hash, returning 202 while a receipt is still pending.
const awaitingReceipts = new Set<string>();
const volatile = new Map<string, QueuedTrade>();
const launchResults = new Map<string, ConfirmedLaunch>();
const resultKey = (record: QueuedTrade) => `lumenrise:launch-confirmed:${tradeQueueKey(record)}`;
function saveLaunchResult(record: QueuedTrade, launch: ConfirmedLaunch) {
  launchResults.set(resultKey(record), launch);
  try { localStorage.setItem(resultKey(record), JSON.stringify(launch)); } catch { /* Retain the session result. */ }
}
export function readLaunchConfirmation(record: QueuedTrade): ConfirmedLaunch | undefined {
  const cached = launchResults.get(resultKey(record));
  if (cached) return cached;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(resultKey(record)) ?? 'null');
    if (value && typeof value === 'object' && 'slug' in value && typeof value.slug === 'string' &&
        'contractId' in value && typeof value.contractId === 'string') return { slug: value.slug, contractId: value.contractId };
  } catch { /* Confirmation can be requested again if the cached result is damaged. */ }
}
export function enqueueLaunch(record: Pick<QueuedTrade, 'network' | 'contractId' | 'transactionHash' | 'traderAddress'> & {
  chain: ApiChain; userId: string; apiBaseUrl: string;
}) {
  const queued: QueuedTrade = { ...record, transactionHash: canonicalHash(record.transactionHash, record.chain), action: 'launch', attempts: 0, nextAttemptAt: 0, state: 'pending' };
  if (!readLaunchConfirmation(queued) && !readTradeQueue().some(item => tradeQueueKey(item) === tradeQueueKey(queued))) save(queued);
  changed();
  return queued;
}
export function registrationRecorded(record: QueuedTrade, launches?: ConfirmedLaunch[]) {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent(REGISTERED_EVENT, { detail: { record, launches } }));
}

/** Only backend registration is retried here; wallet work is never invoked. */
export async function waitForLaunchRegistration(record: QueuedTrade, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  const current = () => getApiUserId() === record.userId && getApiChain() === record.chain &&
    getApiNetwork() === record.network && getApiBaseUrl() === record.apiBaseUrl;
  do {
    if (!current()) break;
    const result = readLaunchConfirmation(record);
    if (result) return result;
    await flushTradeQueue({ network: record.network, contractId: record.contractId,
      traderAddress: record.traderAddress, signal: new AbortController().signal, onRecorded: registrationRecorded });
    if (!current()) break;
    const registered = readLaunchConfirmation(record);
    if (registered) return registered;
    const queued = readTradeQueue().find(item => tradeQueueKey(item) === tradeQueueKey(record));
    if (queued?.state === 'invalid') throw new Error(`Your launch is confirmed on-chain, but backend registration needs attention: ${queued.error ?? 'The server rejected confirmation.'} Keep the Factory hash; automatic event indexing remains available.`);
    if (queued?.state === 'identity' || Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, Math.max(0, deadline - Date.now()))));
  } while (Date.now() <= deadline);
  return undefined;
}
const sameAddress = (left: string, right: string, chain: ApiChain) =>
  chain === 'base' ? left.toLowerCase() === right.toLowerCase() : left === right;
const canonicalHash = (hash: string, chain: ApiChain) =>
  chain === 'base' ? `0x${hash.replace(/^0x/i, '').toLowerCase()}` : hash.replace(/^0x/i, '').toLowerCase();
export const tradeQueueKey = (
  trade: Pick<QueuedTrade, 'chain' | 'network' | 'contractId' | 'transactionHash' | 'userId' | 'action' | 'apiBaseUrl'>,
) => `${PREFIX}${encodeURIComponent(trade.apiBaseUrl)}:${trade.chain ?? 'stellar'}:${trade.network}:${encodeURIComponent(trade.userId ?? '')}:${trade.action ?? 'trade'}:${trade.action === 'launch' ? '' : trade.chain === 'base' ? trade.contractId.toLowerCase() : trade.contractId}:${trade.transactionHash}`;
function changed() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(QUEUE_EVENT));
}
function save(trade: QueuedTrade) {
  const key = tradeQueueKey(trade);
  // A blocked browser store cannot undo a transaction that was already sent.
  volatile.set(key, trade);
  try {
    localStorage.setItem(key, JSON.stringify(trade));
    volatile.delete(key);
    return true;
  } catch {
    return false;
  }
}
export function readTradeQueue(): QueuedTrade[] {
  const records = new Map(volatile);
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (!value || typeof value !== 'object') continue;
        const t = value as Partial<QueuedTrade>;
        if (
          (t.chain === undefined || t.chain === 'stellar' || t.chain === 'base') &&
          (t.action === undefined || t.action === 'trade' || t.action === 'launch') &&
          (t.network === 'testnet' || t.network === 'public') &&
          typeof t.contractId === 'string' &&
          typeof t.transactionHash === 'string' &&
          typeof t.traderAddress === 'string' &&
          (t.userId === null || typeof t.userId === 'string') &&
          typeof t.apiBaseUrl === 'string' &&
          typeof t.attempts === 'number' &&
          Number.isFinite(t.attempts) &&
          typeof t.nextAttemptAt === 'number' &&
          Number.isFinite(t.nextAttemptAt) &&
          (t.state === 'pending' ||
            t.state === 'identity' ||
            t.state === 'invalid')
        ) {
          const record = {
            chain: t.chain,
            action: t.action === 'launch' ? 'launch' as const : 'trade' as const,
            network: t.network,
            contractId: t.contractId,
            slug: typeof t.slug === 'string' ? t.slug : undefined,
            transactionHash: canonicalHash(t.transactionHash, t.chain ?? 'stellar'),
            traderAddress: t.traderAddress,
            userId: t.userId,
            apiBaseUrl: t.apiBaseUrl,
            attempts: t.attempts,
            nextAttemptAt: t.nextAttemptAt,
            state: t.state,
            error: typeof t.error === 'string' ? t.error : undefined,
          };
          const canonical = tradeQueueKey(record);
          const legacy = `${PREFIX}${record.chain === 'base' ? 'base:' : ''}${record.network}:${record.contractId}:${t.transactionHash}`;
          if ((canonical === key || legacy === key) && !records.has(canonical)) {
            records.set(canonical, record);
            if (legacy === key && save(record)) localStorage.removeItem(key);
          }
        }
      } catch {
        /* One damaged entry must not prevent recovery of other hashes. */
      }
    }
  } catch {
    /* Volatile records remain available during this session. */
  }
  return [...records.values()];
}
export function enqueueTrade(
  network: ApiNetwork,
  contractId: string,
  transactionHash: string,
  traderAddress: string,
  slug?: string,
  context?: { chain: ApiChain; userId: string; apiBaseUrl: string; awaitingReceipt?: boolean },
): boolean {
  transactionHash = canonicalHash(transactionHash, context?.chain ?? getApiChain());
  const existing = readTradeQueue().find(
    (t) =>
      (t.chain ?? 'stellar') === (context?.chain ?? getApiChain()) &&
      (t.action ?? 'trade') === 'trade' &&
      t.userId === (context?.userId ?? getApiUserId()) &&
      t.apiBaseUrl === (context?.apiBaseUrl ?? getApiBaseUrl()) &&
      t.network === network &&
      sameAddress(t.contractId, contractId, context?.chain ?? getApiChain()) &&
      t.transactionHash === transactionHash,
  );
  const identity = { chain: context?.chain ?? getApiChain(), network, contractId, transactionHash,
    userId: context?.userId ?? getApiUserId(), apiBaseUrl: context?.apiBaseUrl ?? getApiBaseUrl(), action: 'trade' as const };
  if (context?.awaitingReceipt) awaitingReceipts.add(tradeQueueKey(existing ?? identity));
  const persisted = existing
    ? save({ ...existing, slug: slug ?? existing.slug })
    : save({
        chain: context?.chain ?? getApiChain(),
        action: 'trade',
        network,
        contractId,
        slug,
        transactionHash,
        traderAddress,
        userId: context?.userId ?? getApiUserId(),
        apiBaseUrl: context?.apiBaseUrl ?? getApiBaseUrl(),
        attempts: 0,
        nextAttemptAt: 0,
        state: 'pending',
      });
  changed();
  return persisted;
}
export function releaseTradeReceipt(network: ApiNetwork, transactionHash: string, context: {
  chain: ApiChain; userId: string; apiBaseUrl: string;
}, reverted = false) {
  for (const record of readTradeQueue()) {
    if ((record.action ?? 'trade') !== 'trade' || record.chain !== context.chain || record.network !== network ||
        record.userId !== context.userId || record.apiBaseUrl !== context.apiBaseUrl ||
        record.transactionHash !== canonicalHash(transactionHash, context.chain)) continue;
    awaitingReceipts.delete(tradeQueueKey(record));
    if (reverted) save({ ...record, state: 'invalid', error: 'The transaction reverted on-chain.' });
  }
  changed();
}
export function resumeTradeIdentity(
  network: ApiNetwork,
  contractId: string,
  traderAddress: string,
) {
  for (const trade of readTradeQueue()) {
    if (
      (trade.chain ?? 'stellar') === getApiChain() &&
      trade.network === network &&
      sameAddress(trade.contractId, contractId, getApiChain()) &&
      sameAddress(trade.traderAddress, traderAddress, getApiChain()) &&
      trade.userId === getApiUserId() &&
      trade.state === 'identity'
    )
      save({ ...trade, state: 'pending', nextAttemptAt: 0 });
  }
  changed();
}
function remove(trade: QueuedTrade) {
  volatile.delete(tradeQueueKey(trade));
  try { localStorage.removeItem(tradeQueueKey(trade)); } catch { /* A repeated confirmation is idempotent. */ }
}
export function retryDelay(error: unknown, attempts: number) {
  if (
    error instanceof ApiError &&
    error.retryAfterMs !== undefined &&
    Number.isFinite(error.retryAfterMs)
  )
    return Math.max(1000, error.retryAfterMs);
  const cap = Math.min(300_000, 5000 * 2 ** Math.min(attempts, 6));
  return Math.round(cap * (0.8 + Math.random() * 0.2));
}

/** Registers one durable hash. Never submits, signs, or confirms a transaction. */
export async function flushTradeQueue(options: {
  network: ApiNetwork;
  contractId?: string;
  slug?: string;
  traderAddress?: string;
  signal: AbortSignal;
  onRecorded: (record: QueuedTrade, launches?: ConfirmedLaunch[]) => void;
}) {
  const userId = getApiUserId();
  const chain = getApiChain();
  const slug = options.slug;
  if (!userId || options.signal.aborted) return;
  try { if (getApiNetwork() !== options.network) return; } catch { /* Legacy Stellar boot configuration. */ }
  // Sequential draining bounds network traffic even after many pending trades.
  for (const original of readTradeQueue()) {
    if (options.signal.aborted || getApiUserId() !== userId || getApiChain() !== chain) break;
    if (
      (original.chain ?? 'stellar') !== chain ||
      original.network !== options.network ||
      (options.contractId && original.action !== 'launch' && !sameAddress(original.contractId, options.contractId, chain)) ||
      (options.traderAddress && !sameAddress(original.traderAddress, options.traderAddress, chain)) ||
      original.userId !== userId ||
      original.apiBaseUrl !== getApiBaseUrl() ||
      ((original.action ?? 'trade') === 'trade' && !(original.slug ?? slug))
    )
      continue;
    const key = tradeQueueKey(original);
    if (inFlight.has(key) || awaitingReceipts.has(key)) continue;
    const run = async () => {
      const trade = readTradeQueue().find((t) => tradeQueueKey(t) === key);
      if (
        !trade ||
        trade.state !== 'pending' ||
        trade.nextAttemptAt > Date.now() ||
        options.signal.aborted ||
        getApiUserId() !== userId || getApiChain() !== chain || getApiBaseUrl() !== trade?.apiBaseUrl
      )
        return;
      inFlight.add(key);
      const bound = { ...trade, userId };
      save(bound);
      try {
        if (trade.action === 'launch') {
          const launches = await confirmLaunch(trade.transactionHash, { chain, network: trade.network }, options.signal);
          const matched = trade.contractId
            ? launches.find(launch => sameAddress(launch.contractId, trade.contractId, chain))
            : launches.length === 1 ? launches[0] : undefined;
          if (!matched) throw new ApiError('The confirmed launch does not match the saved transaction.', 'invalid-response');
          saveLaunchResult(bound, matched);
          remove(bound);
          options.onRecorded(bound, launches);
          return;
        }
        const report = (target: string) => recordTrade(target, trade.network, trade.transactionHash, options.signal, { chain, network: trade.network });
        try { await report(trade.slug ?? slug!); }
        catch (error) {
          if (chain !== 'base' || !(error instanceof ApiError) || error.status !== 404) throw error;
          // A repaired slug can only be recovered by matching the persisted contract in the original namespace.
          let currentSlug: string | null = null;
          for (let page = 1; !options.signal.aborted; page++) {
            if (getApiUserId() !== userId || getApiChain() !== chain || getApiBaseUrl() !== bound.apiBaseUrl) throw error;
            const result = await getLaunchList(trade.network, page, getConfiguration().rules.launches.defaultLimit, undefined, options.signal);
            currentSlug = result.launches.find(launch => sameAddress(launch.contractId, trade.contractId, chain))?.slug ?? null;
            if (currentSlug || page * result.limit >= result.total) break;
          }
          if (!currentSlug) throw error;
          bound.slug = currentSlug; save(bound);
          await report(currentSlug);
        }
        remove(bound);
        options.onRecorded(bound);
      } catch (error) {
        if (options.signal.aborted) return;
        const status = error instanceof ApiError ? error.status : undefined;
        const state =
          status === 401 || (error instanceof ApiError && error.code === 'unauthenticated')
            ? 'identity'
            : (status !== undefined && status !== 202 && status !== 429 && status < 500) ||
                (error instanceof ApiError && error.code === 'invalid-response')
              ? 'invalid'
              : 'pending';
        save({
          ...bound,
          attempts: trade.attempts + 1,
          state,
          error: error instanceof Error ? error.message : 'Backend confirmation is unavailable.',
          nextAttemptAt: Date.now() + retryDelay(error, trade.attempts),
        });
      } finally {
        inFlight.delete(key);
        changed();
      }
    };
    // Also deduplicate across tabs where Web Locks is available.
    if (typeof navigator !== 'undefined' && navigator.locks)
      await navigator.locks.request(
        key,
        { ifAvailable: true },
        async (lock) => {
          if (lock) await run();
        },
      );
    else await run();
  }
}
