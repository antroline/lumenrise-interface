import { launchTokenDeployment } from './tokenDeployment';
import type { ApiNetwork } from '../api/launches/types';
export const BASE_MAINNET_BLOCK_REASON = 'Base Mainnet execution is unavailable because its deployment and indexing are not supported.';
export const BASE_TOKEN_DEPLOYMENT_BLOCK_REASON = 'Base token creation is unavailable: a verified LaunchToken deployment artifact with creation bytecode is required. The factory only deposits an existing token’s full owner balance.';
// Retained for the existing Create status; trading validates its own runtime prerequisites.
export const BASE_WRITE_BLOCK_REASON = BASE_TOKEN_DEPLOYMENT_BLOCK_REASON;
export function requireBaseWrites(operation: 'creation' | 'trading' = 'creation', network: ApiNetwork = 'testnet') {
  if (network !== 'testnet') throw new Error(BASE_MAINNET_BLOCK_REASON);
  if (operation === 'creation' && (!/^0x[0-9a-f]+$/i.test(launchTokenDeployment.bytecode) || launchTokenDeployment.bytecode.length <= 2 || !/^0x[0-9a-f]+$/i.test(launchTokenDeployment.deployedBytecode))) throw new Error(BASE_TOKEN_DEPLOYMENT_BLOCK_REASON);
}
