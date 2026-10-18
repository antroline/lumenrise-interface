const RETURN_KEY = 'launchpad:returnTo';

/** Keep authentication redirects local and out of the registration/onboarding flow. */
export function authReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const url = new URL(value, 'https://lumenrise.local');
    if (url.origin !== 'https://lumenrise.local' || /^\/(register|onboarding)(\/|$)/.test(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

/** Capture the actual page, including filters and anchors, before leaving for registration. */
export function saveAuthReturnTo(fallback = '/'): void {
  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}${hash}`;
  const target = /^\/(register|onboarding)(\/|$)/.test(pathname)
    ? window.sessionStorage.getItem(RETURN_KEY) || fallback
    : current;
  window.sessionStorage.setItem(RETURN_KEY, authReturnPath(target));
}

export function consumeAuthReturnTo(fallback = '/'): string {
  const target = window.sessionStorage.getItem(RETURN_KEY) || fallback;
  window.sessionStorage.removeItem(RETURN_KEY);
  return authReturnPath(target);
}
