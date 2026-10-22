import { ApiError, getApiBaseUrl, getApiUserId } from '../client';
import { recordTrade } from './market';
import type { ApiNetwork } from './types';

const PREFIX = 'lumenrise:trade-registration:';
export const QUEUE_EVENT = 'lumenrise:trade-registration-changed';
export type QueuedTrade = {
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
};
const inFlight = new Set<string>();
const volatile = new Map<string, QueuedTrade>();
export const tradeQueueKey = (
  trade: Pick<QueuedTrade, 'network' | 'contractId' | 'transactionHash'>,
) => `${PREFIX}${trade.network}:${trade.contractId}:${trade.transactionHash}`;
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
            network: t.network,
            contractId: t.contractId,
            slug: typeof t.slug === 'string' ? t.slug : undefined,
            transactionHash: t.transactionHash,
            traderAddress: t.traderAddress,
            userId: t.userId,
            apiBaseUrl: t.apiBaseUrl,
            attempts: t.attempts,
            nextAttemptAt: t.nextAttemptAt,
            state: t.state,
          };
          if (tradeQueueKey(record) === key && !records.has(key))
            records.set(key, record);
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
): boolean {
  const existing = readTradeQueue().find(
    (t) =>
      t.network === network &&
      t.contractId === contractId &&
      t.transactionHash === transactionHash,
  );
  const persisted = existing
    ? save({ ...existing, slug: slug ?? existing.slug })
    : save({
        network,
        contractId,
        slug,
        transactionHash,
        traderAddress,
        userId: getApiUserId(),
        apiBaseUrl: getApiBaseUrl(),
        attempts: 0,
        nextAttemptAt: 0,
        state: 'pending',
      });
  changed();
  return persisted;
}
export function resumeTradeIdentity(
  network: ApiNetwork,
  contractId: string,
  traderAddress: string,
) {
  for (const trade of readTradeQueue()) {
    if (
      trade.network === network &&
      trade.contractId === contractId &&
      trade.traderAddress === traderAddress &&
      trade.state === 'identity'
    )
      save({ ...trade, state: 'pending', nextAttemptAt: 0 });
  }
  changed();
}
function remove(trade: QueuedTrade) {
  volatile.delete(tradeQueueKey(trade));
  localStorage.removeItem(tradeQueueKey(trade));
}
export function retryDelay(error: unknown, attempts: number) {
  if (
    error instanceof ApiError &&
    error.retryAfterMs !== undefined &&
    Number.isFinite(error.retryAfterMs)
  )
    return Math.max(1000, error.retryAfterMs);
  return Math.min(300_000, 5000 * 2 ** Math.min(attempts, 6));
}

/** Registers one durable hash. Never submits, signs, or confirms a transaction. */
export async function flushTradeQueue(options: {
  network: ApiNetwork;
  contractId: string;
  slug?: string;
  traderAddress?: string;
  signal: AbortSignal;
  onRecorded: () => void;
}) {
  const userId = getApiUserId();
  const slug = options.slug;
  if (!userId || !options.traderAddress || !slug || options.signal.aborted) return;
  // Sequential draining bounds network traffic even after many pending trades.
  for (const original of readTradeQueue()) {
    if (options.signal.aborted || getApiUserId() !== userId) break;
    if (
      original.network !== options.network ||
      original.contractId !== options.contractId ||
      original.traderAddress !== options.traderAddress ||
      (original.userId !== null && original.userId !== userId) ||
      original.apiBaseUrl !== getApiBaseUrl()
    )
      continue;
    const key = tradeQueueKey(original);
    if (inFlight.has(key)) continue;
    const run = async () => {
      const trade = readTradeQueue().find((t) => tradeQueueKey(t) === key);
      if (
        !trade ||
        trade.state !== 'pending' ||
        trade.nextAttemptAt > Date.now() ||
        options.signal.aborted ||
        getApiUserId() !== userId
      )
        return;
      inFlight.add(key);
      const bound = { ...trade, userId };
      save(bound);
      try {
        await recordTrade(
          slug,
          trade.network,
          trade.transactionHash,
          options.signal,
        );
        remove(bound);
        options.onRecorded();
      } catch (error) {
        if (options.signal.aborted) return;
        const status = error instanceof ApiError ? error.status : undefined;
        const state =
          status === 400
            ? 'invalid'
            : status === 401 ||
                status === 403 ||
                (error instanceof ApiError && error.code === 'unauthenticated')
              ? 'identity'
              : 'pending';
        save({
          ...bound,
          attempts: trade.attempts + 1,
          state,
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
