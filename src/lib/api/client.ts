/**
 * Shared HTTP client for the LumenRise API.
 *
 * The API identifies users through the `X-User-Id` header, which carries the
 * numeric user id issued by the authentication provider after sign-in. There
 * are no bearer tokens, JWTs, or refresh flows for this API.
 *
 * All responses use the envelope `{ status: "success" | "error", message, result }`.
 */

export type ApiErrorCode =
  | 'http'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'unauthenticated';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly result?: unknown;
  /** The server's own message when the response carried one, otherwise null. */
  readonly serverMessage: string | null;

  constructor(
    message: string,
    code: ApiErrorCode,
    options?: {
      status?: number;
      result?: unknown;
      serverMessage?: string | null;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options?.status;
    this.result = options?.result;
    this.serverMessage = options?.serverMessage ?? null;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 30_000;

let apiBaseUrl = '';
let currentUserId: string | null = null;

/**
 * Points the client at the configured API origin. Called once by the app
 * providers with the value from project settings; an empty value falls back
 * to same-origin requests.
 */
export function configureApi(baseUrl: string) {
  apiBaseUrl = baseUrl.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

/** Called by the app providers whenever the signed-in user changes or signs out. */
export function setApiUserId(userId: string | null) {
  currentUserId = userId && /^\d+$/.test(userId) ? userId : null;
}

export function getApiUserId() {
  return currentUserId;
}

/**
 * Builds the request URL for an API path such as `/auth/status`. The `/v1`
 * prefix is added unless the configured base URL already ends with it.
 */
export function apiUrl(path: string) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (!apiBaseUrl) return `/v1${suffix}`;
  return apiBaseUrl.endsWith('/v1')
    ? `${apiBaseUrl}${suffix}`
    : `${apiBaseUrl}/v1${suffix}`;
}

/**
 * Resolves a file URL returned by the API (for example an avatar). Absolute
 * URLs pass through; paths resolve against the API origin.
 */
export function resolveApiFileUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!apiBaseUrl) return url;
  try {
    const origin = new URL(apiBaseUrl).origin;
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
  } catch {
    return url;
  }
}

/** Formats a byte limit from the API (413 `result.maxBytes`) for display. */
export function formatByteLimit(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type ApiEnvelope = {
  status?: unknown;
  message?: unknown;
  error?: unknown;
  result?: unknown;
};

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  /** Attach the `X-User-Id` header for endpoints that identify a user. */
  user?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function parseEnvelope(text: string): ApiEnvelope {
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as ApiEnvelope) : {};
  } catch {
    return {};
  }
}

function envelopeMessage(envelope: ApiEnvelope): string | null {
  if (typeof envelope.message === 'string' && envelope.message.trim()) {
    return envelope.message;
  }
  if (typeof envelope.error === 'string' && envelope.error.trim()) {
    return envelope.error;
  }
  return null;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  // FormData bodies intentionally set no Content-Type: the browser adds the
  // multipart boundary itself.
  if (options.user) {
    const userId = getApiUserId();
    if (!userId) {
      throw new ApiError(
        'A signed-in account is required for this request.',
        'unauthenticated',
      );
    }
    headers['X-User-Id'] = userId;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    options.timeoutMs ??
      (options.formData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS),
  );
  const cancelFromCaller = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else
      options.signal.addEventListener('abort', cancelFromCaller, {
        once: true,
      });
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body:
        options.formData ??
        (options.json !== undefined ? JSON.stringify(options.json) : undefined),
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError('The request timed out. Try again.', 'timeout');
    }
    if (options.signal?.aborted || controller.signal.aborted) {
      throw error instanceof Error ? error : new Error('Request aborted');
    }
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      'network',
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancelFromCaller);
  }

  const envelope = parseEnvelope(await response.text());

  if (!response.ok) {
    const serverMessage = envelopeMessage(envelope);
    throw new ApiError(
      serverMessage ?? `The request failed (${response.status}).`,
      'http',
      { status: response.status, result: envelope.result, serverMessage },
    );
  }
  if (envelope.status !== 'success') {
    const serverMessage = envelopeMessage(envelope);
    throw new ApiError(
      serverMessage ?? 'The server returned an unexpected response.',
      envelope.status === 'error' ? 'http' : 'invalid-response',
      { status: response.status, result: envelope.result, serverMessage },
    );
  }
  return envelope.result as T;
}

/** True for responses aborted because the user signed out or switched accounts. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
