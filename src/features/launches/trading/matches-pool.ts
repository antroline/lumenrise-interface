import type { LiquidityPool } from '../data/trading';
export type PoolFilter = 'all' | 'amm' | 'dex';
export function matches(pool: LiquidityPool, filter: PoolFilter) {
  if (filter === 'amm') return pool.type.startsWith('AMM');
  if (filter === 'dex') return pool.type === 'Order book';
  return true;
}
