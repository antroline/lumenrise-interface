import { StrKey } from '@stellar/stellar-sdk';
import { getApiChain } from './api/client';
import { isEvmAddress, sameEvmAddress } from './base/wallet';
import type { ApiNetwork } from './api/launches/types';

export function isContractAddress(value: string): boolean {
  return getApiChain() === 'base' ? isEvmAddress(value) : StrKey.isValidContract(value);
}
export function isWalletAddress(value: string): boolean {
  return getApiChain() === 'base' ? isEvmAddress(value) : StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value);
}
export function sameAddress(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && (getApiChain() === 'base' ? sameEvmAddress(a, b) : a === b);
}
export function routeNetwork(network: ApiNetwork): string {
  return getApiChain() === 'base' ? network === 'public' ? 'base-mainnet' : 'base-sepolia' : network;
}
export function explorerUrl(value: string, network: ApiNetwork, transaction = false): string {
  if (getApiChain() === 'base')
    return `https://${network === 'testnet' ? 'sepolia.' : ''}basescan.org/${transaction ? 'tx' : 'address'}/${encodeURIComponent(value)}`;
  return `https://stellar.expert/explorer/${network}/${transaction ? 'tx' : value.startsWith('C') ? 'contract' : 'account'}/${encodeURIComponent(value)}`;
}
export function explorerName(): string { return getApiChain() === 'base' ? 'BaseScan' : 'Stellar Expert'; }
