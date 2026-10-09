import { Asset, StrKey, type Horizon } from '@stellar/stellar-sdk';

export const UNIT = BigInt(10_000_000);
export const MAX_ASSET_AMOUNT = BigInt('9223372036854775807');
export type Status = 'Scheduled' | 'Open' | 'Failed' | 'Graduated';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The contract returned an unexpected data structure.');
  return Object.fromEntries(Object.entries(value));
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('The contract returned an invalid text value.');
  return value;
}

export function integer(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error('The contract returned an invalid integer.');
}

function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('The contract returned an invalid boolean.');
  return value;
}

function enumName(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return text(value[0]);
  return text(object(value).tag);
}

export function decodeStatus(value: unknown): Status {
  const status = enumName(value);
  if (status !== 'Scheduled' && status !== 'Open' && status !== 'Failed' && status !== 'Graduated')
    throw new Error('This contract returned an unsupported launch status.');
  return status;
}

export function decodeConfig(value: unknown) {
  const c = object(value);
  const p = object(c.params);
  const m = object(p.metadata);
  const a = object(p.allocations);
  const v = object(p.vesting);
  const curve = object(p.curve);
  const b = object(c.buckets);
  return {
    factory: text(c.factory), platform: text(c.platform), platform_fee_bps: integer(c.platform_fee_bps),
    total_supply: integer(c.total_supply),
    buckets: { pool: integer(b.pool), curve: integer(b.curve), team: integer(b.team) },
    params: {
      owner: text(p.owner), asset: text(p.asset), pair: text(p.pair),
      starts_at: integer(p.starts_at), ends_at: integer(p.ends_at),
      metadata: { name: text(m.name), symbol: text(m.symbol), description: text(m.description), logo: text(m.logo) },
      allocations: { pool_bps: integer(a.pool_bps), curve_bps: integer(a.curve_bps), team_bps: integer(a.team_bps) },
      vesting: { cliff_seconds: integer(v.cliff_seconds), duration_seconds: integer(v.duration_seconds), schedule: enumName(v.schedule) },
      curve: {
        virtual_base_reserve: integer(curve.virtual_base_reserve), virtual_quote_reserve: integer(curve.virtual_quote_reserve),
        graduation_target: integer(curve.graduation_target), creator_fee_bps: integer(curve.creator_fee_bps),
        creator_payout_bps: integer(curve.creator_payout_bps),
      },
    },
  };
}
export type Config = ReturnType<typeof decodeConfig>;

export function decodeState(value: unknown) {
  const s = object(value);
  return {
    sold: integer(s.sold), quote_reserve: integer(s.quote_reserve), creator_fees: integer(s.creator_fees),
    team_claimed: integer(s.team_claimed), buyer_count: integer(s.buyer_count),
    graduated: bool(s.graduated), busy: bool(s.busy),
  };
}

export function decodeQuote(value: unknown) {
  const q = object(value);
  return { gross: integer(q.gross), creator_fee: integer(q.creator_fee), user_amount: integer(q.user_amount) };
}

export function decodePreview(value: unknown) {
  const p = object(value);
  return {
    creator_payout: integer(p.creator_payout), platform_fee: integer(p.platform_fee),
    pool_pair_amount: integer(p.pool_pair_amount), pool_asset_amount: integer(p.pool_asset_amount),
    unsold_curve_amount: integer(p.unsold_curve_amount),
  };
}

export function decodeSnapshot(values: readonly unknown[]) {
  return {
    config: decodeConfig(values[0]), state: decodeState(values[1]), status: decodeStatus(values[2]),
    price: integer(values[3]), buyers: integer(values[4]), claimableTeam: integer(values[5]),
    preview: decodePreview(values[6]),
  };
}
export type Snapshot = ReturnType<typeof decodeSnapshot>;

export function decodeTokens(values: readonly unknown[], config: Config, network: string) {
  const assetName = text(values[0]);
  const pairName = text(values[3]);
  return {
    assetName, assetSymbol: text(values[1]), assetDecimals: integer(values[2]),
    pairName, pairSymbol: text(values[4]), pairDecimals: integer(values[5]),
    vaultAssetBalance: integer(values[6]), vaultPairBalance: integer(values[7]),
    asset: assetFromSac(assetName, config.params.asset, network),
    pair: assetFromSac(pairName, config.params.pair, network),
  };
}
export type Tokens = ReturnType<typeof decodeTokens>;

// SAC names expose the classic code and issuer. Verify the derived SAC before
// using either for changeTrust; display metadata alone is not an asset identity.
export function assetFromSac(name: string, address: string, network: string): Asset {
  const native = Asset.native();
  if (native.contractId(network) === address) return native;
  const [code, issuer, extra] = name.split(':');
  if (!code || !issuer || extra !== undefined || !StrKey.isValidEd25519PublicKey(issuer))
    throw new Error('Could not resolve this Stellar Asset Contract to its classic asset.');
  const asset = new Asset(code, issuer);
  if (asset.contractId(network) !== address)
    throw new Error('The token identity does not match its contract address.');
  return asset;
}

export function parseAmount(value: string, allowZero = false): bigint {
  const entry = value.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(entry))
    throw new Error('Enter an amount with up to 7 decimal places.');
  const [whole, fraction = ''] = entry.split('.');
  const amount = BigInt(whole) * UNIT + BigInt(fraction.padEnd(7, '0'));
  if (amount > MAX_ASSET_AMOUNT || amount < BigInt(0) || (!allowZero && amount === BigInt(0)))
    throw new Error('The amount must be positive and within the Stellar asset limit.');
  return amount;
}

export function formatAmount(amount: bigint): string {
  const negative = amount < BigInt(0);
  const value = negative ? -amount : amount;
  const fraction = (value % UNIT).toString().padStart(7, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${value / UNIT}${fraction ? `.${fraction}` : ''}`;
}

export function defaultLimit(receipt: bigint, buying: boolean) {
  const margin = (receipt * BigInt(50) + BigInt(9_999)) / BigInt(10_000);
  return buying ? receipt + margin : receipt > margin ? receipt - margin : BigInt(0);
}

export function balanceLine(account: Horizon.AccountResponse, asset: Asset) {
  return account.balances.find(line => asset.isNative()
    ? line.asset_type === 'native'
    : 'asset_code' in line && line.asset_code === asset.getCode() && line.asset_issuer === asset.getIssuer());
}

export function trusts(account: Horizon.AccountResponse, asset: Asset) {
  return asset.isNative() || asset.getIssuer() === account.account_id || !!balanceLine(account, asset);
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message.replace(/^BLUX:\s*/i, '') : 'The request failed. Please retry.';
}
