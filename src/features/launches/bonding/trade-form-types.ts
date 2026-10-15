import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from './contract';

export type TradeFormProps = {
  address: string;
  network?: ApiNetwork;
  snapshot: Snapshot;
  tokens: Tokens;
  side: 'buy' | 'sell';
  locked: boolean;
  setLocked: (value: boolean) => void;
  refresh: () => Promise<void>;
  balances?: { held: bigint; pairHeld: bigint; position: bigint };
};
