export const isEvmAddress = (value: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(value);
export const isEvmTransactionHash = (value: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(value);
export const sameEvmAddress = (a: string, b: string): boolean => isEvmAddress(a) && isEvmAddress(b) && a.toLowerCase() === b.toLowerCase();

/** EIP-7702 delegated EOAs may originate ordinary transactions (unlike contract accounts). */
export function canOriginateBaseTransaction(code: string | null | undefined): boolean {
  return code === null || code === undefined || code === '0x' || /^0xef0100[0-9a-f]{40}$/i.test(code);
}

/** Include linked smart-wallet accounts, not just EOAs. */
export function linkedEvmAddresses(accounts: readonly { type: string; address?: string; chainType?: string }[]): string[] {
  return [...new Set(accounts.filter(account =>
    (account.type === 'wallet' || account.type === 'smart_wallet') &&
    account.chainType !== 'solana' && account.address && isEvmAddress(account.address),
  ).map(account => account.address!.toLowerCase()))];
}
export function selectLinkedWallet<T extends { address: string }>(wallets: readonly T[], linked: readonly string[], preferred?: string): T | undefined {
  const eligible = wallets.filter(wallet => linked.some(address => sameEvmAddress(address, wallet.address)));
  return eligible.find(wallet => preferred && sameEvmAddress(wallet.address, preferred)) ?? eligible[0];
}

export async function ensureBaseWalletNetwork(adapter: {
  getChainId: () => Promise<number>;
  switchChain: (chainId: number) => Promise<unknown>;
}, network: 'testnet' | 'public') {
  const expected = network === 'testnet' ? 84532 : 8453;
  if (await adapter.getChainId() !== expected) await adapter.switchChain(expected);
  if (await adapter.getChainId() !== expected) throw new Error('The wallet is on the wrong Base network. Signing is blocked.');
}
