export const baseUtf8Length = (value: string) => new TextEncoder().encode(value).length;
export function baseMetadataError(value: string, field: 'name' | 'symbol' | 'description' | 'logo'): string | undefined {
  const length = baseUtf8Length(value), maximum = { name: 64, symbol: 12, description: 512, logo: 256 }[field];
  if (length > maximum || ((field === 'name' || field === 'symbol') && length === 0)) return `Contract ${field} must ${field === 'name' || field === 'symbol' ? 'contain 1–' : 'use at most '}${maximum} UTF-8 bytes.`;
}
