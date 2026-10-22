export function isLaunchSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value !== 'team' && value !== 'prelaunch';
}

export function projectNameError(name: string): string | undefined {
  const preview = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!isLaunchSlug(preview)) return 'Choose a name that produces 1–100 URL characters (a–z, 0–9 and hyphens), other than team or prelaunch.';
}

export function requireLaunchSlug(value: unknown): asserts value is string {
  if (!isLaunchSlug(value)) throw new Error('This project page is not available yet.');
}
