export function shortAddress(address?: string) {
  if (!address) return 'No wallet connected';
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}
