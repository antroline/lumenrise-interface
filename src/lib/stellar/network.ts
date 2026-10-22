import type { ApiNetwork } from '../api/launches/types';
import type { PublicConfiguration } from '../api/config';

// Immutable per document: pending signatures retain their original settings.
export let NETWORK: string;
export let API_NETWORK: ApiNetwork;
export let HORIZON_URL: string;
export let SOROBAN_URL: string;
export let FACTORY_CONTRACT_ID: string;
export let HOME_DOMAIN: string;
export let LAUNCH_CONFIGURED: boolean;

export function configureNetwork(config: PublicConfiguration, network: ApiNetwork) {
  if (API_NETWORK) {
    if (API_NETWORK !== network) throw new Error('Reload to change the Stellar network.');
  }
  const entry = config.network.configurations[network];
  if (!entry || !config.network.supported.includes(network)) throw new Error('Unsupported Stellar network.');
  if (!entry.rpcUrl) throw new Error('Soroban RPC is not configured for ' + network + '.');
  NETWORK = entry.networkPassphrase;
  HORIZON_URL = entry.horizonUrl;
  SOROBAN_URL = entry.rpcUrl;
  FACTORY_CONTRACT_ID = entry.factoryContractId;
  HOME_DOMAIN = entry.homeDomain;
  LAUNCH_CONFIGURED = entry.launchConfigured;
  API_NETWORK = network;
}
