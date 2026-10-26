'use client';

import { readContracts } from '@bluxcc/react';
import { useQuery } from '@tanstack/react-query';
import { NETWORK } from '@/lib/stellar/network';
import { integer } from './contract';
import type { BalanceStatus } from './trade-form-types';

type WalletReadOptions = {
  address: string;
  owner: string | undefined;
  asset: string;
  pair: string;
  enabled: boolean;
};

function useWalletValue(
  options: WalletReadOptions,
  contract: string,
  fn: 'balance' | 'sellable_balance',
) {
  const query = useQuery({
    queryKey: ['launch-wallet', NETWORK, options.address, options.owner, contract, fn],
    queryFn: async () => {
      if (!options.owner) throw new Error('A wallet address is required.');
      const result = await readContracts(
        [{ address: contract, fn, args: [options.owner] }],
        { network: NETWORK },
      );
      // Validate before caching so a malformed refresh retains the last good value.
      return integer(result.values[0]);
    },
    enabled: options.enabled,
    refetchInterval: 15_000,
    retry: false,
  });
  const status: BalanceStatus =
    query.data !== undefined
      ? query.isError ? 'stale' : 'ready'
      : query.isError || query.isFetched ? 'error'
        : query.isLoading ? 'loading' : 'idle';
  return { ...query, balanceStatus: status };
}

export function useWalletBalances(options: WalletReadOptions) {
  // Each read has its own cache: a missing receiving trustline or failed
  // sellable_balance call must not hide the spending asset's balance.
  const held = useWalletValue(options, options.asset, 'balance');
  const pairHeld = useWalletValue(options, options.pair, 'balance');
  const position = useWalletValue(options, options.address, 'sellable_balance');

  return {
    balances: { held: held.data, pairHeld: pairHeld.data, position: position.data },
    balanceStatus: {
      held: held.balanceStatus,
      pairHeld: pairHeld.balanceStatus,
      position: position.balanceStatus,
    },
    async refetch() {
      await Promise.allSettled([held.refetch(), pairHeld.refetch(), position.refetch()]);
    },
  };
}
