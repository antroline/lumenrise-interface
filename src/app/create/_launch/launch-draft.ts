export type SaleMethod = 'bonding' | 'fixed' | 'auction';
export type LaunchMethod = 'basic' | SaleMethod;
export type QuoteToken = 'XLM' | 'USDC';
export type LaunchDurationDays = '7' | '14' | '30' | '60';

type LaunchSchedule = {
  startsAt: string;
  endsAt: string;
  durationDays: LaunchDurationDays;
};

export type LaunchDraft = {
  method: LaunchMethod;
  methodSelected: boolean;
  name: string;
  symbol: string;
  description: string;
  logo: string;
  website: string;
  xAccount: string;
  quote: QuoteToken;
  supply: string;
  allocation: {
    saleShare: string;
    poolShare: string;
    teamShare: string;
    cliffMonths: string;
    vestingMonths: string;
  };
  bonding: LaunchSchedule & {
    target: string;
    creatorFee: boolean;
  };
  fixed: LaunchSchedule & {
    price: string;
    walletCap: string;
  };
  auction: LaunchSchedule & {
    floorPrice: string;
    liquidityShare: string;
    threshold: string;
    timelockDays: string;
  };
  eligibility: {
    mode: 'open' | 'allowlist' | 'reputation' | 'custom';
    requirements: string;
    identificationMode: 'none' | 'required';
    identificationRequirements: string;
  };
  participantVesting: {
    mode: 'immediate' | 'linear';
    tgePercent: string;
    cliffMonths: string;
    durationMonths: string;
  };
};

export const initialLaunchDraft: LaunchDraft = {
  method: 'basic',
  methodSelected: false,
  name: '',
  symbol: '',
  description: '',
  logo: '',
  website: '',
  xAccount: '',
  quote: 'XLM',
  supply: '100000000',
  allocation: {
    saleShare: '80',
    poolShare: '20',
    teamShare: '0',
    cliffMonths: '0',
    vestingMonths: '0',
  },
  bonding: {
    target: '',
    creatorFee: false,
    startsAt: '',
    endsAt: '',
    durationDays: '14',
  },
  fixed: {
    price: '',
    startsAt: '',
    endsAt: '',
    durationDays: '14',
    walletCap: '',
  },
  auction: {
    floorPrice: '',
    startsAt: '',
    endsAt: '',
    durationDays: '14',
    liquidityShare: '50',
    threshold: '',
    timelockDays: '0',
  },
  eligibility: {
    mode: 'open',
    requirements: '',
    identificationMode: 'none',
    identificationRequirements: '',
  },
  participantVesting: {
    mode: 'immediate',
    tgePercent: '25',
    cliffMonths: '0',
    durationMonths: '6',
  },
};

export const methodLabels: Record<LaunchMethod, string> = {
  basic: 'Basic',
  bonding: 'Bonding curve',
  fixed: 'Fixed price',
  auction: 'Auction',
};

export const allocationLabels: Record<LaunchMethod, string> = {
  basic: 'Launch',
  bonding: 'Bonding curve',
  fixed: 'Presale',
  auction: 'Auction',
};

export const launchDurationOptions = [
  { label: '1 week', value: '7' },
  { label: '2 weeks', value: '14' },
  { label: '1 month', value: '30' },
  { label: '2 months', value: '60' },
] as const;

export function launchDurationLabel(days: string) {
  const option = launchDurationOptions.find(
    (duration) => duration.value === days,
  );
  return option ? `After ${option.label}` : 'After 2 weeks';
}

export function numberValue(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return NaN;
  return Number(value);
}

export function validPositive(value: string) {
  const number = numberValue(value);
  return Number.isFinite(number) && number > 0;
}

export function validSupply(value: string) {
  if (!/^\d+(?:\.\d{1,7})?$/.test(value.trim())) return false;
  const [whole, fraction = ''] = value.trim().split('.');
  const units =
    BigInt(whole) * BigInt(10_000_000) + BigInt(fraction.padEnd(7, '0'));
  return units > BigInt(0) && units <= BigInt('9223372036854775807');
}

export function validPercent(value: string, allowZero = true) {
  const number = numberValue(value);
  return (
    /^\d+(?:\.\d{1,2})?$/.test(value.trim()) &&
    Number.isFinite(number) &&
    number >= (allowZero ? 0 : Number.EPSILON) &&
    number <= 100
  );
}

export function validNonNegativeInteger(value: string) {
  return /^\d+$/.test(value.trim());
}

export function formatAmount(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return '—';
  const [whole, fraction] = value.trim().split('.');
  const grouped = BigInt(whole).toLocaleString('en-US');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatSupplyShare(supply: string, percent: string) {
  if (!validSupply(supply) || !validPercent(percent)) return '—';
  const [whole, fraction = ''] = supply.trim().split('.');
  const units =
    BigInt(whole) * BigInt(10_000_000) + BigInt(fraction.padEnd(7, '0'));
  const [percentWhole, percentFraction = ''] = percent.trim().split('.');
  const basisPoints =
    BigInt(percentWhole) * BigInt(100) + BigInt(percentFraction.padEnd(2, '0'));
  const allocated = (units * basisPoints) / BigInt(10_000);
  const allocatedWhole = allocated / BigInt(10_000_000);
  const allocatedFraction = String(allocated % BigInt(10_000_000))
    .padStart(7, '0')
    .replace(/0+$/, '');
  return allocatedFraction
    ? `${allocatedWhole.toLocaleString('en-US')}.${allocatedFraction}`
    : allocatedWhole.toLocaleString('en-US');
}

export function localDateTimeToIso(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

export function isoToLocalDateTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function validOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname.includes('.');
  } catch {
    return false;
  }
}
