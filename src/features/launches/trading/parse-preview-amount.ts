export function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : Number.NaN;
}
