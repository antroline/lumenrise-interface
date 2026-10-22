import { Horizon, rpc } from '@stellar/stellar-sdk';
import { HORIZON_URL, SOROBAN_URL } from './network';

export { API_NETWORK, NETWORK } from './network';

export let horizon: Horizon.Server;
export let soroban: rpc.Server;

export function initializeStellarClients() {
  if (!HORIZON_URL || !SOROBAN_URL) throw new Error('Stellar configuration is not ready.');
  const nextHorizon = new Horizon.Server(HORIZON_URL);
  const nextSoroban = new rpc.Server(SOROBAN_URL);
  horizon = nextHorizon;
  soroban = nextSoroban;
}
