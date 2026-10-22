import { getConfiguration } from '../config';
import { StrKey } from '@stellar/stellar-sdk';
import { ApiError, apiRequest } from '../client';
import type { ApiNetwork } from './types';

export type Holder = { address: string; balance: string; observedAt: string };
export type HoldersResult = {
  network: ApiNetwork;
  contractId: string;
  asset: string;
  amountScale: 7;
  balanceSource: 'token_contract';
  coverage: 'trade_participants';
  totalHolders: number;
  nextCursor: string | null;
  items: Holder[];
};

export async function getHolders(
  contractId: string,
  network: ApiNetwork,
  options: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<HoldersResult> {
  const rule = getConfiguration().rules.holders;
  const limit = options.limit ?? rule.defaultLimit;
  if (
    !StrKey.isValidContract(contractId) ||
    (network !== 'testnet' && network !== 'public') ||
    !Number.isInteger(limit) ||
    limit < rule.minLimit ||
    limit > rule.maxLimit ||
    (options.cursor?.length ?? 0) > rule.cursorMaxLength
  ) {
    throw new ApiError('Invalid holder query', 'http', { status: 400 });
  }
  const params = new URLSearchParams({ network, limit: String(limit) });
  if (options.cursor !== undefined) params.set('cursor', options.cursor);
  const result = await apiRequest<HoldersResult>(
    `/launches/${encodeURIComponent(contractId)}/holders?${params}`,
    { signal },
  );
  if (
    !result ||
    result.contractId !== contractId ||
    result.network !== network ||
    !StrKey.isValidContract(result.asset) ||
    result.amountScale !== 7 ||
    result.balanceSource !== 'token_contract' ||
    result.coverage !== 'trade_participants' ||
    !Number.isSafeInteger(result.totalHolders) ||
    result.totalHolders < 0 ||
    (result.nextCursor !== null && typeof result.nextCursor !== 'string') ||
    !Array.isArray(result.items) ||
    result.items.some(
      (item) =>
        !item ||
        typeof item.address !== 'string' ||
        !(
          StrKey.isValidEd25519PublicKey(item.address) ||
          StrKey.isValidContract(item.address)
        ) ||
        typeof item.balance !== 'string' ||
        !/^\d+$/.test(item.balance) ||
        typeof item.observedAt !== 'string' ||
        !Number.isFinite(Date.parse(item.observedAt)),
    )
  ) {
    throw new ApiError(
      'The server returned invalid holder data.',
      'invalid-response',
    );
  }
  return result;
}

export function formatHolderBalance(raw: string, scale: number): string {
  const units = BigInt(raw);
  const divisor = BigInt(10) ** BigInt(scale);
  const fraction = (units % divisor)
    .toString()
    .padStart(scale, '0')
    .replace(/0+$/, '');
  return `${units / divisor}${fraction ? `.${fraction}` : ''}`;
}

export function appendHolders(items: Holder[], next: Holder[]): Holder[] {
  const seen = new Set(items.map((item) => item.address));
  return [
    ...items,
    ...next.filter((item) => {
      if (seen.has(item.address)) return false;
      seen.add(item.address);
      return true;
    }),
  ];
}
