import type { ApiNetwork } from '@/lib/api/launches/types';

export const NETWORK = 'Test SDF Network ; September 2015';
export const API_NETWORK: ApiNetwork = 'testnet';
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL?.trim() ||
  'https://horizon-testnet.stellar.org';
export const SOROBAN_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL?.trim() ||
  'https://soroban-testnet.stellar.org';
