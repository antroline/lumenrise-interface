export type Blockchain = 'stellar' | 'base';
export type NetworkEnvironment = 'mainnet' | 'testnet';
export type StellarNetworkId = 'stellar-mainnet' | 'stellar-testnet';
export type BaseNetworkId = 'base-mainnet' | 'base-sepolia';
export type NetworkId = StellarNetworkId | BaseNetworkId;

type NetworkMetadata = {
  label: string;
  environment: NetworkEnvironment;
  nativeCurrency: string;
  capabilities: { wallet: boolean; projects: boolean; trading: boolean; creation: boolean };
};

export type StellarNetwork = NetworkMetadata & {
  id: StellarNetworkId;
  blockchain: 'stellar';
  apiNetwork: 'public' | 'testnet';
};

export type BaseNetwork = NetworkMetadata & {
  id: BaseNetworkId;
  blockchain: 'base';
  apiNetwork: 'public' | 'testnet';
  chainId: 8453 | 84532;
};

export type AppNetwork = StellarNetwork | BaseNetwork;
