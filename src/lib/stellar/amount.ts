export const UNIT = BigInt(10_000_000);
export const MAX_ASSET_AMOUNT = BigInt('9223372036854775807');

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

export function formatAmount(amount: bigint, decimals: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 7): string {
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const step = BigInt(10) ** BigInt(7 - decimals);
  const value = ((absolute + step / BigInt(2)) / step) * step;
  const fraction = (value % UNIT).toString().padStart(7, '0').replace(/0+$/, '');
  return `${negative && value !== BigInt(0) ? '-' : ''}${value / UNIT}${fraction ? `.${fraction}` : ''}`;
}

