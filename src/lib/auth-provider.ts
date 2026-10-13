/**
 * Auth provider session helpers.
 *
 * Sign-in is handled entirely by the authentication provider SDK. After
 * sign-in the provider's session token is available in the browser; this
 * module is the single place that knows how to read it and extract the
 * provider's numeric user id. The user id is not a credential — the API
 * verifies the user behind it with the provider server-side — and it must
 * not be confused with the wallet address or the internal identity id.
 */

// Storage keys used by the provider SDK to persist the current session.
const PROVIDER_TOKEN_STORAGE_KEY = '__BLUX__JWT_STORE';
const PROVIDER_SESSION_STORAGE_KEY = '__BLUX__RECENT_LOGIN_CONFIG';

/** Claims that may carry the provider's numeric user id, in priority order. */
const USER_ID_CLAIMS = ['sub', 'user_id', 'userId', 'uid', 'id'] as const;

function readProviderToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(PROVIDER_TOKEN_STORAGE_KEY);
    if (token) return token;
    const record = window.localStorage.getItem(PROVIDER_SESSION_STORAGE_KEY);
    if (!record) return null;
    const parsed: unknown = JSON.parse(record);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { jwt?: unknown }).jwt === 'string'
    ) {
      const jwt = (parsed as { jwt: string }).jwt;
      return jwt || null;
    }
    return null;
  } catch {
    return null;
  }
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function normalizeUserId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  return null;
}

/**
 * Returns the signed-in user's numeric id at the authentication provider, or
 * null when no valid session token is available. Callers must treat null as
 * an error state and never fall back to the wallet address instead.
 */
export function getAuthProviderUserId(): string | null {
  const token = readProviderToken();
  if (!token) return null;
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  for (const claim of USER_ID_CLAIMS) {
    const userId = normalizeUserId(payload[claim]);
    if (userId) return userId;
  }
  return null;
}
