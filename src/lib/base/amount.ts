export const MAX_BASE_AMOUNT = (BigInt(1) << BigInt(128)) - BigInt(1);
export const MAX_BASE_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);
export function requireBaseTokenDecimals(decimals: number | bigint): number {
  const value = Number(decimals);
  if (!Number.isInteger(value) || value < 0 || value > 18) throw new Error('Token decimals must be between 0 and 18.');
  return value;
}
export function parseBaseAmount(value: string, decimals: number): bigint {
  requireBaseTokenDecimals(decimals);
  const input = value.trim();
  if (input.length > 100 || !/^\d+(?:\.\d+)?$/.test(input)) throw new Error('Enter a positive decimal amount.');
  const [whole, fraction = ''] = input.split('.');
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places.`);
  const amount = BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (amount <= BigInt(0) || amount > MAX_BASE_UINT256) throw new Error('Amount is outside uint256 bounds.');
  return amount;
}
export function formatBaseAmount(amount: bigint, decimals: number, precision = decimals): string {
  requireBaseTokenDecimals(decimals);
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const unit = BigInt(10) ** BigInt(decimals);
  const fraction = (absolute % unit).toString().padStart(decimals, '0').slice(0, Math.min(precision, decimals)).replace(/0+$/, '');
  return `${negative ? '-' : ''}${absolute / unit}${fraction ? '.' + fraction : ''}`;
}
export function baseSlippageBounds(amount: bigint, basisPoints: number) {
  if (amount < BigInt(0) || amount > MAX_BASE_UINT256 || !Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) throw new Error('Invalid amount or slippage.');
  const unit = BigInt(10000), bps = BigInt(basisPoints);
  const maximum = (amount * (unit + bps) + unit - BigInt(1)) / unit;
  if (maximum > MAX_BASE_UINT256) throw new Error('Slippage exceeds uint256 bounds.');
  return { minimum: amount * (unit - bps) / unit, maximum };
}
export function baseExecutionPrice(gross: bigint, asset: bigint, assetDecimals: number) {
  requireBaseTokenDecimals(assetDecimals);
  if (gross < BigInt(0) || asset <= BigInt(0)) throw new Error('Invalid execution amounts.');
  return (gross * BigInt(10) ** BigInt(assetDecimals) + asset - BigInt(1)) / asset;
}
export const sellableBaseBalance = (balance: bigint, rights: bigint) => balance < rights ? balance : rights;
