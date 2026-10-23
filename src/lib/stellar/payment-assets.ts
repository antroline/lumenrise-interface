import type { ApiNetwork } from '../api/launches/types';

// Circle's native USDC assets, scoped to their Stellar networks:
// https://developers.circle.com/stablecoins/usdc-contract-addresses
export const USDC_CONTRACTS: Record<ApiNetwork, string> = {
  testnet: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  public: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
};
