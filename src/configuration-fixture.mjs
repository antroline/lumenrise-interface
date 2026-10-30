import { configuration } from './lib/api/config.fixture.mjs';
import { StrKey } from '@stellar/stellar-sdk';
export { configuration };
export const configurationModule = { getConfiguration: () => configuration };
export const networkModule = {
  API_NETWORK: 'testnet', NETWORK: configuration.network.configurations.testnet.networkPassphrase,
  HOME_DOMAIN: configuration.network.configurations.testnet.homeDomain,
  FACTORY_CONTRACT_ID: configuration.network.configurations.testnet.factoryContractId,
  LAUNCH_CONFIGURED: true,
};
export const apiContextModule = { API_NETWORK: 'testnet', getApiChain: () => 'stellar', getApiNetwork: () => 'testnet' };
export const chainAddressModule = {
  routeNetwork: network => network,
  sameAddress: (a, b) => !!a && a === b,
  isContractAddress: value => StrKey.isValidContract(value),
};
