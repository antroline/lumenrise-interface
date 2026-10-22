import { configuration } from './lib/api/config.fixture.mjs';
export { configuration };
export const configurationModule = { getConfiguration: () => configuration };
export const networkModule = {
  API_NETWORK: 'testnet', NETWORK: configuration.network.configurations.testnet.networkPassphrase,
  HOME_DOMAIN: configuration.network.configurations.testnet.homeDomain,
  FACTORY_CONTRACT_ID: configuration.network.configurations.testnet.factoryContractId,
  LAUNCH_CONFIGURED: true,
};
