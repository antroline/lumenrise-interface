import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from './contract';

export type BalanceStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error';

export type TradeFormProps = {
  address: string;
  slug?: string;
  network?: ApiNetwork;
  snapshot: Snapshot;
  tokens: Tokens;
  tokenLogo?: string;
  side: 'buy' | 'sell';
  compact?: boolean;
  quoteHost?: HTMLElement | null;
  active?: boolean;
  locked: boolean;
  setLocked: (value: boolean) => void;
  refresh: () => Promise<void>;
  balances?: { held?: bigint; pairHeld?: bigint; position?: bigint };
  balanceStatus?: Record<'held' | 'pairHeld' | 'position', BalanceStatus>;
};
