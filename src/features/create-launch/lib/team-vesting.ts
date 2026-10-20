import { validNonNegativeInteger } from './launch-draft';

const MONTH_SECONDS = BigInt(30 * 24 * 60 * 60);
const MAX_U64 = BigInt('18446744073709551615');

export function teamVestingError(value: string): string | undefined {
  if (!validNonNegativeInteger(value)) return 'Enter a whole number of months, starting at 0.';
  if (BigInt(value.trim()) * MONTH_SECONDS > MAX_U64) return 'Team vesting exceeds the contract duration limit.';
}

export function monthsToSeconds(value: string) {
  const error = teamVestingError(value);
  if (error) throw new Error(error);
  return (BigInt(value.trim()) * MONTH_SECONDS).toString();
}
