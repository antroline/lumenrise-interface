import { Horizon, Networks, rpc } from '@stellar/stellar-sdk';
import { API_NETWORK, HORIZON_URL, NETWORK, SOROBAN_URL } from './network';

export { API_NETWORK, NETWORK } from './network';

export let horizon: Horizon.Server;
export let soroban: rpc.Server;

export async function initializeStellarClients() {
  if (!HORIZON_URL || !SOROBAN_URL)
    throw new Error('Stellar configuration is not ready.');
  const expected =
    API_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;
  const label = API_NETWORK === 'public' ? 'Mainnet' : 'Testnet';
  if (NETWORK !== expected)
    throw new Error(
      `${label} network passphrase is incorrect in the server configuration.`,
    );
  const nextHorizon = new Horizon.Server(HORIZON_URL);
  const nextSoroban = new rpc.Server(SOROBAN_URL);
  const [horizonNetwork, rpcNetwork] = await Promise.all([
    nextHorizon.root(),
    nextSoroban.getNetwork(),
  ]);
  if (
    horizonNetwork.network_passphrase !== expected ||
    rpcNetwork.passphrase !== expected
  )
    throw new Error(
      `${label} endpoints connect to a different Stellar network. Correct the server's RPC and Horizon configuration.`,
    );
  horizon = nextHorizon;
  soroban = nextSoroban;
}
