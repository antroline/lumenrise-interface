/** Accepts only plain http(s) links without embedded credentials. */
export function safeExternalUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
