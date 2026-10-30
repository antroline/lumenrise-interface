import type { PublicConfiguration } from '../api/config';
import { BASE_NETWORKS } from '../base/networks';
import { stellarNetworks } from '../stellar/networks';
import type { AppNetwork, NetworkId } from './types';

export const NETWORK_STORAGE_KEY = 'lumenrise:network-id';
export const LEGACY_NETWORK_STORAGE_KEY = 'lumenrise:network';

/** Legacy URLs remain valid at the boundary; domain state uses explicit IDs. */
export function parseNetworkId(value: string | null): NetworkId | null {
  switch (value) {
    case null:
    case 'stellar': return null; // Resolve the server's default Stellar environment.
    case 'public':
    case 'mainnet':
    case 'stellar-mainnet': return 'stellar-mainnet';
    case 'testnet':
    case 'stellar-testnet': return 'stellar-testnet';
    case 'base':
    case 'base-mainnet': return 'base-mainnet';
    case 'base-sepolia': return 'base-sepolia';
    default: throw new Error('Unsupported network.');
  }
}

export function availableNetworks(config?: PublicConfiguration): readonly AppNetwork[] {
  return [...(config ? stellarNetworks(config) : []), ...BASE_NETWORKS];
}

export function resolveNetwork(value: string | null, config?: PublicConfiguration): AppNetwork {
  const id = parseNetworkId(value) ?? (config?.network.default === 'public' ? 'stellar-mainnet' : 'stellar-testnet');
  const network = availableNetworks(config).find(entry => entry.id === id);
  if (!network) throw new Error('The selected network is not supported by the server.');
  return network;
}

/** Switching networks leaves project-specific routes and filters behind. */
export function networkSwitchHref(network: NetworkId | 'stellar'): string {
  return `/projects?network=${network}`;
}

export function isProjectRoute(pathname: string): boolean {
  return /^\/(?:projects|launch(?:es)?|auction)\/[^/]+(?:\/.*)?$/.test(pathname);
}

/** A project link cannot silently replace a visitor's selected network. */
export function initialNetworkSelection(requested: string | null, saved: string | null, pathname: string): string | null {
  parseNetworkId(requested);
  return isProjectRoute(pathname) && saved !== null ? saved : requested ?? saved;
}

export function networkLabel(id: NetworkId): string {
  return id.startsWith('base-')
    ? resolveNetwork(id).label
    : id === 'stellar-mainnet' ? 'Stellar Mainnet' : 'Stellar Testnet';
}
