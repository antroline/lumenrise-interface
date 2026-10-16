import { Horizon, rpc } from '@stellar/stellar-sdk';
import { HORIZON_URL, SOROBAN_URL } from './network';

export { API_NETWORK, NETWORK } from './network';

export const horizon = new Horizon.Server(HORIZON_URL);
export const soroban = new rpc.Server(SOROBAN_URL);
