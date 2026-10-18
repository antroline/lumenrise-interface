import { StrKey } from '@stellar/stellar-sdk';
import { horizon, soroban } from './transactions';

const MAX_AMOUNT = BigInt('9223372036854775807');
const TOKEN_UNIT = BigInt(10_000_000);

export type LaunchInput = { name: string; code: string; amount: string };
export type Stage =
  | 'setupPending'
  | 'issuerReady'
  | 'setupConfirmed'
  | 'sacPending'
  | 'sacConfirmed'
  | 'complete';
export type LaunchRecord = LaunchInput & {
  creator: string;
  issuer: string;
  sac: string;
  stage: Stage;
  setupHash: string;
  setupXdr?: string;
  issuerSecret?: string;
  distributionHash?: string;
  distributionXdr?: string;
  sacHash?: string;
  sacXdr?: string;
};

export function isLaunchRecord(value: unknown): value is LaunchRecord {
  if (!value || typeof value !== 'object') return false;
  if (!('stage' in value && typeof value.stage === 'string')) return false;
  const stages: string[] = [
    'setupPending',
    'issuerReady',
    'setupConfirmed',
    'sacPending',
    'sacConfirmed',
    'complete',
  ];
  if (!stages.includes(value.stage)) return false;
  return [
    'name',
    'code',
    'amount',
    'creator',
    'issuer',
    'sac',
    'setupHash',
  ].every((key) => key in value && typeof Reflect.get(value, key) === 'string');
}

export function toUnits(amount: string): bigint {
  const [whole, decimals = ''] = amount.split('.');
  return BigInt(whole) * TOKEN_UNIT + BigInt(decimals.padEnd(7, '0'));
}

export function validateAmount(value: string) {
  const amount = value.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(amount))
    throw new Error(
      'Supply must be a positive number with at most 7 decimal places.',
    );
  const units = toUnits(amount);
  if (units <= BigInt(0) || units > MAX_AMOUNT)
    throw new Error("Supply is outside Stellar's allowed range.");
  const [whole, decimals = ''] = amount.split('.');
  return `${BigInt(whole)}${decimals ? `.${decimals}` : ''}`;
}

export function validateInput(input: LaunchInput): LaunchInput {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name || name.length > 40)
    throw new Error('Enter a name, up to 40 characters.');
  if (!/^[A-Z0-9]{1,12}$/.test(code))
    throw new Error('Asset code must be 1 to 12 letters or numbers.');
  return {
    name,
    code,
    amount: validateAmount(input.amount),
  };
}

export function requireCreator(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address))
    throw new Error('Connect a funded Stellar G-address on testnet.');
}

function property(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && key in value
    ? Reflect.get(value, key)
    : undefined;
}

export function describeError(error: unknown): string {
  const response = property(error, 'response');
  const codes = property(property(property(response, 'data'), 'extras'), 'result_codes');
  const operations = property(codes, 'operations');
  const messages = [
    property(codes, 'transaction'),
    ...(Array.isArray(operations) ? operations : []),
  ].filter((code): code is string => typeof code === 'string' && code.length > 0);
  if (messages.length)
    return `Stellar rejected the transaction: ${messages.join(', ')}.`;
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Check your wallet and try again.';
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export async function isTransactionConfirmed(hash: string) {
  try {
    const result = await horizon.transactions().transaction(hash).call();
    if (!result.successful) throw new Error('The transaction failed on-chain.');
    return true;
  } catch (error) {
    const status = property(property(error, 'response'), 'status');
    if (status === 404) return false;
    throw error;
  }
}

export async function checkPending(
  record: LaunchRecord,
): Promise<LaunchRecord> {
  if (record.stage === 'setupPending') {
    if (!(await isTransactionConfirmed(record.setupHash)))
      throw new Error(
        'Issue transaction is still pending. Check again shortly.',
      );
    return {
      ...record,
      setupXdr: undefined,
      stage:
        record.issuerSecret || record.distributionXdr
          ? 'issuerReady'
          : 'setupConfirmed',
    };
  }
  if (record.stage === 'sacPending' && record.sacHash) {
    const result = await soroban.getTransaction(record.sacHash);
    if (result.status === 'SUCCESS')
      return { ...record, stage: 'sacConfirmed', sacXdr: undefined };
    if (result.status === 'FAILED')
      return {
        ...record,
        stage: 'setupConfirmed',
        sacHash: undefined,
        sacXdr: undefined,
      };
    if (result.status === 'NOT_FOUND' && record.sacXdr) return record;
    throw new Error('SAC deployment is still pending. Check again shortly.');
  }
  return record;
}
