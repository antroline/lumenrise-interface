import { decodeEventLog, isAddress, isHash, isHex, type Address, type Hash } from 'viem';
import { factoryAbi } from '@/lib/base/factoryAbi';
import { encodeBaseCreation, type BaseLaunchParams } from '@/lib/base/creation';
import { parseBaseAmount } from '@/lib/base/amount';
import { sameEvmAddress } from '@/lib/base/wallet';
import type { UploadedLaunchImage } from '@/lib/api/launches/types';
import type { LaunchDraft } from './launch-draft';
import { bondingStartDate, isLaunchScheduled } from './launch-draft';
import { calculateDraftLaunch } from './calculate-launch';
import { monthsToSeconds } from './team-vesting';
export function baseObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid contract or recovery data.');
  return value as Record<string, unknown>;
}
export function baseAddress(value: unknown): Address {
  if (typeof value !== 'string' || !isAddress(value)) throw new Error('A verified EVM contract address is required.');
  return value;
}
export function baseInteger(value: unknown): bigint {
  if (typeof value !== 'bigint' || value < BigInt(0)) throw new Error('Invalid on-chain amount.');
  return value;
}
export type BaseCreationRecord = {
  version: 1; identity: string; fingerprint: string; startsAt: string;
  image?: UploadedLaunchImage; tokenAddress?: Address; curveAddress?: Address;
  tokenHash?: Hash; approvalHash?: Hash; factoryHash?: Hash;
  pendingSignature?: 'token' | 'approval' | 'factory';
};
export function baseCreationKey(origin: string, userId: string, owner: string) {
  return `lumenrise:base:testnet:creation:${encodeURIComponent(origin)}:${encodeURIComponent(userId)}:${owner.toLowerCase()}`;
}
export function readBaseCreationRecord(value: string | null, identity: string): BaseCreationRecord | undefined {
  if (!value) return;
  const record = baseObject(JSON.parse(value));
  if (record.version !== 1 || record.identity !== identity || typeof record.fingerprint !== 'string' || typeof record.startsAt !== 'string' || !/^\d+$/.test(record.startsAt)) throw new Error('Saved Base launch recovery does not match this account.');
  for (const field of ['tokenHash', 'approvalHash', 'factoryHash']) if (record[field] !== undefined && (typeof record[field] !== 'string' || !isHash(record[field]))) throw new Error('Invalid saved transaction hash.');
  for (const field of ['tokenAddress', 'curveAddress']) if (record[field] !== undefined) baseAddress(record[field]);
  if (record.pendingSignature !== undefined && !['token', 'approval', 'factory'].includes(String(record.pendingSignature))) throw new Error('Invalid saved signing state.');
  if (record.image !== undefined) {
    const image = baseObject(record.image);
    for (const field of ['name', 'slug', 'imageId', 'publicUrl']) if (typeof image[field] !== 'string' || !image[field]) throw new Error('The saved project reservation is incomplete.');
    if (!['pending', 'cleanup_ready', 'deleting', 'finalized', 'expired'].includes(String(image.status))) throw new Error('Invalid saved image status.');
  }
  // Every persisted field used for execution is checked above; ABI values are rebuilt from the reviewed draft.
  return record as BaseCreationRecord;
}
export function buildBaseBondingParams(draft: LaunchDraft, owner: Address, asset: Address, pair: Address, pairDecimals: number, platformFeeBps: number, image: UploadedLaunchImage, startsAt: bigint): BaseLaunchParams {
  if (draft.method !== 'bonding' || draft.quote !== 'USDC') throw new Error('Select the supported bonding-curve payment asset.');
  if (platformFeeBps !== 100) throw new Error('The factory fee changed from the reviewed launch economics. Creation is unavailable until those calculations are updated.');
  const calculated = calculateDraftLaunch(draft);
  if (!('baseExact' in calculated)) throw new Error('Base launch calculations require Base application context.');
  const unit = BigInt(10) ** BigInt(pairDecimals), usdUnit = BigInt(10) ** BigInt(18);
  const target = (calculated.baseExact.graduationTarget * unit + usdUnit - BigInt(1)) / usdUnit;
  const base = BigInt(calculated.contract.virtual_base_reserve), inventory = BigInt(calculated.tokenUnits.curve);
  const quote = (target * (base - inventory) + inventory - BigInt(1)) / inventory;
  const hasTeam = calculated.allocations.team_bps > 0;
  const params: BaseLaunchParams = { owner, asset, pair, metadata: { name: image.name, symbol: draft.symbol, description: draft.description.trim(), logo: image.publicUrl },
    allocations: calculated.allocations,
    vesting: { cliff_seconds: hasTeam ? BigInt(monthsToSeconds(draft.allocation.cliffMonths)) : BigInt(0), duration_seconds: hasTeam ? BigInt(monthsToSeconds(draft.allocation.vestingMonths)) : BigInt(0), schedule: 1 },
    curve: { virtual_base_reserve: base, virtual_quote_reserve: quote, graduation_target: target, creator_fee_bps: calculated.creatorTaxBps, creator_payout_bps: calculated.creatorPayoutBps }, starts_at: startsAt };
  const deposit = parseBaseAmount(draft.supply, 18);
  encodeBaseCreation(params, { caller: owner, pair, symbol: draft.symbol, reviewedDeposit: deposit, currentBalance: deposit, platformFeeBps });
  return params;
}
export function baseLaunchStart(draft: LaunchDraft, now = Date.now()): string {
  const date = bondingStartDate(draft.bonding);
  if (isLaunchScheduled(draft.bonding) && !date) throw new Error('Choose a launch date and time.');
  const seconds = date ? Math.floor(Date.parse(date) / 1000) : Math.floor(now / 1000) + 60;
  if (!Number.isSafeInteger(seconds) || seconds <= Math.floor(now / 1000)) throw new Error('Choose a future launch start time.');
  return String(seconds);
}
export function baseReceipt(value: unknown) {
  const receipt = baseObject(value);
  if (receipt.status !== 'success' && receipt.status !== 'reverted') throw new Error('Transaction confirmation is unavailable. Keep its hash and retry checking.');
  if (!Array.isArray(receipt.logs)) throw new Error('Transaction logs are unavailable.');
  return { status: receipt.status, contractAddress: receipt.contractAddress == null ? undefined : baseAddress(receipt.contractAddress), logs: receipt.logs };
}
export function createdBaseCurve(logs: readonly unknown[], factory: Address, owner: Address, asset: Address, deposit: bigint): Address {
  for (const entry of logs) {
    const log = baseObject(entry);
    if (typeof log.address !== 'string' || !sameEvmAddress(log.address, factory) || typeof log.data !== 'string' || !isHex(log.data) || !Array.isArray(log.topics) || !log.topics.every(topic => typeof topic === 'string' && isHash(topic)) || !log.topics.length) continue;
    const [first, ...rest] = log.topics;
    try {
      const event = decodeEventLog({ abi: factoryAbi, data: log.data, topics: [first, ...rest] });
      if (event.eventName === 'LaunchCreated' && sameEvmAddress(event.args.owner, owner) && sameEvmAddress(event.args.asset, asset) && event.args.deposited === deposit) return event.args.curve;
    } catch { /* Other receipt events cannot identify this creation. */ }
  }
  throw new Error('The mined transaction did not contain the expected LaunchCreated event. Do not submit another launch.');
}
export function isWalletRejection(error: unknown): boolean {
  const seen = new Set<unknown>(); let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === 4001 || 'name' in current && current.name === 'UserRejectedRequestError') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}
