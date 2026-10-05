import { readContracts } from '@bluxcc/react';
import { StrKey } from '@stellar/stellar-sdk';
import { horizon, LOCK_CONTRACT_ID, NETWORK, soroban } from './transactions';

const STORAGE_KEY = 'launchpad:last-testnet-launch';
const STORAGE_PREFIX = 'launchpad:testnet-launch:';
export const BASIC_AUTH_RETURN_KEY = 'launchpad:basic-auth-return';
const MAX_AMOUNT = BigInt('9223372036854775807');
const TOKEN_UNIT = BigInt(10_000_000);

export type LaunchInput = { name: string; code: string; amount: string };
export type Stage =
  | 'setupPending'
  | 'issuerReady'
  | 'setupConfirmed'
  | 'sacPending'
  | 'sacConfirmed'
  | 'depositPending'
  | 'complete'
  | 'withdrawPending'
  | 'withdrawn';
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
  depositHash?: string;
  withdrawHash?: string;
  lockAmount?: string;
  unlockAt?: number;
};

function isLaunchRecord(value: unknown): value is LaunchRecord {
  if (!value || typeof value !== 'object') return false;
  if (!('stage' in value && typeof value.stage === 'string')) return false;
  const stages: string[] = [
    'setupPending',
    'issuerReady',
    'setupConfirmed',
    'sacPending',
    'sacConfirmed',
    'depositPending',
    'complete',
    'withdrawPending',
    'withdrawn',
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

function readStoredLaunch(value: string | null): LaunchRecord | null {
  if (!value) return null;
  try {
    const record: unknown = JSON.parse(value);
    if (!isLaunchRecord(record)) return null;
    if (record.stage === 'complete' && !record.depositHash)
      return { ...record, stage: 'sacConfirmed' };
    return record;
  } catch {
    return null;
  }
}

export function loadLaunch(issuer: string): LaunchRecord | null {
  if (typeof window === 'undefined') return null;
  if (!StrKey.isValidEd25519PublicKey(issuer)) return null;
  try {
    for (const key of [`${STORAGE_PREFIX}${issuer}`, STORAGE_KEY]) {
      const record = readStoredLaunch(localStorage.getItem(key));
      if (record?.issuer === issuer) return record;
    }
  } catch {
    return null;
  }
  return null;
}

export function saveLaunch(record: LaunchRecord) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${record.issuer}`,
    JSON.stringify(record),
  );
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

export function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response as {
      data?: {
        extras?: {
          result_codes?: { transaction?: string; operations?: string[] };
        };
      };
    };
    const codes = response.data?.extras?.result_codes;
    if (codes)
      return `Stellar rejected the transaction: ${[codes.transaction, ...(codes.operations ?? [])].filter(Boolean).join(', ')}.`;
  }
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Check your wallet and try again.';
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function formatTokenUnits(value: string) {
  try {
    const units = BigInt(value);
    const decimals = (units % TOKEN_UNIT)
      .toString()
      .padStart(7, '0')
      .replace(/0+$/, '');
    return `${units / TOKEN_UNIT}${decimals ? `.${decimals}` : ''}`;
  } catch {
    return value;
  }
}

export async function isTransactionConfirmed(hash: string) {
  try {
    const result = await horizon.transactions().transaction(hash).call();
    if (!result.successful) throw new Error('The transaction failed on-chain.');
    return true;
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'response' in error
        ? (error.response as { status?: number }).status
        : undefined;
    if (status === 404) return false;
    throw error;
  }
}

type Lock = {
  amount: string | number | bigint;
  unlock_at: string | number | bigint;
};
export async function readLock(record: LaunchRecord) {
  const result = await readContracts<[Lock | null]>(
    [
      {
        address: LOCK_CONTRACT_ID,
        fn: 'get_lock',
        args: [record.creator, record.sac],
      },
    ],
    { network: NETWORK },
  );
  const lock = result.values[0];
  if (!lock) return null;
  return { amount: String(lock.amount), unlockAt: Number(lock.unlock_at) };
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
  if (record.stage === 'depositPending' && record.depositHash) {
    const result = await soroban.getTransaction(record.depositHash);
    if (result.status === 'SUCCESS') {
      const lock = await readLock(record);
      if (!lock)
        throw new Error(
          'Deposit confirmed, but lock details are not visible yet.',
        );
      return {
        ...record,
        stage: 'complete',
        lockAmount: lock.amount,
        unlockAt: lock.unlockAt,
      };
    }
    if (result.status === 'FAILED')
      return { ...record, stage: 'sacConfirmed', depositHash: undefined };
    throw new Error('Deposit is still pending. Check again shortly.');
  }
  if (record.stage === 'withdrawPending' && record.withdrawHash) {
    const result = await soroban.getTransaction(record.withdrawHash);
    if (result.status === 'SUCCESS') return { ...record, stage: 'withdrawn' };
    if (result.status === 'FAILED')
      return { ...record, stage: 'complete', withdrawHash: undefined };
    throw new Error('Withdrawal is still pending. Check again shortly.');
  }
  return record;
}
