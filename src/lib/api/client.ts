/**
 * Shared HTTP client for the LumenRise API.
 *
 * Stellar retains Blux identification. Base additionally requires a current
 * Privy bearer token matching the full DID in X-User-Id.
 *
 * All responses use the envelope `{ status: "success" | "error", message, result }`.
 */

export type ApiErrorCode =
  | 'http'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'unavailable'
  | 'unauthenticated';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly result?: unknown;
  /** The server's own message when the response carried one, otherwise null. */
  readonly serverMessage: string | null;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    code: ApiErrorCode,
    options?: {
      status?: number;
      result?: unknown;
      serverMessage?: string | null;
      retryAfterMs?: number;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options?.status;
    this.result = options?.result;
    this.serverMessage = options?.serverMessage ?? null;
    this.retryAfterMs = options?.retryAfterMs;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 30_000;

let apiBaseUrl = '';
let currentUserId: string | null = null;
let selectedNetwork: string | undefined;
/** Shared read context. Stellar transaction configuration remains independent. */
export let API_NETWORK: 'testnet' | 'public';
let supportedNetworks: readonly string[] = [];
let chainApiAvailable = true;
export type ApiChain = 'stellar' | 'base';
export type ApiContext = { chain: ApiChain; network: 'testnet' | 'public' };
let selectedChain: ApiChain = 'stellar';
let baseAuthentication: { userId: string; getAccessToken: () => Promise<string | null>; onExpired: () => void } | null = null;
let contextRevision = 0;
const retryDeadlines = new Map<string, number>();

export function getApiChain(): ApiChain { return selectedChain; }
export function getApiNetwork(): 'testnet' | 'public' {
  if (selectedNetwork !== 'testnet' && selectedNetwork !== 'public') throw new Error('API network is not configured.');
  return selectedNetwork;
}
export function getApiContext(): ApiContext { return { chain: selectedChain, network: getApiNetwork() }; }
export function configureApiContext(context: ApiContext, supported: readonly string[] = ['testnet', 'public']) {
  if (context.chain !== selectedChain || context.network !== selectedNetwork) {
    contextRevision++;
    currentUserId = null;
    baseAuthentication = null;
  }
  selectedChain = context.chain;
  configureApiNetwork(context.network, supported);
  chainApiAvailable = true;
}
export function setBaseAuthentication(value: typeof baseAuthentication) {
  if (value && !/^did:privy:[A-Za-z0-9_-]+$/.test(value.userId)) throw new Error('Invalid Privy identity.');
  baseAuthentication = value;
}

/** Retained for callers that explicitly gate unavailable services. */
export function setChainApiAvailable(available: boolean) {
  chainApiAvailable = available;
}

export function configureApiNetwork(network: string, supported: readonly string[]) {
  if (!supported.includes(network)) throw new Error('Unsupported API network.');
  selectedNetwork = network;
  if (network === 'testnet' || network === 'public') API_NETWORK = network;
  supportedNetworks = supported;
}

/**
 * Points the client at the configured API origin. Called once by the app
 * providers with the value from project settings; an empty value falls back
 * to same-origin requests.
 */
export function configureApi(baseUrl: string) {
  const next = baseUrl.trim().replace(/\/+$/, '');
  if (next !== apiBaseUrl) contextRevision++;
  apiBaseUrl = next;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

/** Called by the app providers whenever the signed-in user changes or signs out. */
export function setApiUserId(userId: string | null) {
  currentUserId = userId && (selectedChain === 'base' ? /^did:privy:[A-Za-z0-9_-]+$/ : /^\d+$/).test(userId) ? userId : null;
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  /** Attach the `X-User-Id` header for endpoints that identify a user. */
  user?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Some mutations only complete on a specific success status (trade recording: 200). */
  expectedStatus?: number;
  network?: 'testnet' | 'public';
  /** Durable work must retain its originating chain and environment. */
  context?: ApiContext;
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
  if (!/^\/(?!\/)/.test(path) || path.includes('#') || path.includes('\\'))
    throw new ApiError('Invalid API path.', 'invalid-response');
  const revision = contextRevision;
  const chain = options.context?.chain ?? selectedChain;
  if (chain !== selectedChain) throw new ApiError('Reload to change request chain.', 'unavailable');
  const headers: Record<string, string> = {};
  headers['X-Chain'] = chain;
  if (path !== '/config' || chain === 'base') {
    if (!chainApiAvailable)
      throw new ApiError('Services for the selected network are not available yet.', 'unavailable');
    const queryNetwork = new URLSearchParams(path.split('?')[1]).get('network');
    const explicit = options.context?.network ?? options.network;
    const bodyNetwork = options.formData?.get('network') ??
      (options.json && typeof options.json === 'object' && 'network' in options.json ? options.json.network : undefined);
    const network = explicit ?? queryNetwork ?? selectedNetwork;
    if ((queryNetwork && network !== queryNetwork) || (bodyNetwork != null && bodyNetwork !== network) ||
        (options.context && options.network && options.context.network !== options.network) ||
        (chain === 'base' && selectedNetwork && network !== selectedNetwork))
      throw new ApiError('Conflicting request networks.', 'invalid-response');
    if (network) {
      if (selectedNetwork && !supportedNetworks.includes(network))
        throw new ApiError('Unsupported API network.', 'invalid-response');
      headers[chain === 'base' ? 'X-Network' : 'X-Stellar-Network'] = network;
    }
  }
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  // FormData bodies intentionally set no Content-Type: the browser adds the
  // multipart boundary itself.
  const protectedRequest = options.user || (chain === 'base' && /^\/auth\/(?:resolve|register)(?:\?|$)/.test(path));
  const authentication = baseAuthentication;
  if (chain === 'base' && !/^\/(?:config(?:\?|$)|auth\/(?:resolve|register|status|session)(?:\?|$)|user(?:\/avatar)?(?:\?|$)|launches(?:\/|\?|$))/.test(path))
    throw new ApiError('This feature is available on Stellar only.', 'unavailable');
  if (protectedRequest) {
    const userId = getApiUserId();
    if (!userId) {
      throw new ApiError(
        'A signed-in account is required for this request.',
        'unauthenticated',
      );
    }
    headers['X-User-Id'] = userId;
    if (chain === 'base' && (!authentication || authentication.userId !== userId))
      throw new ApiError('Sign in to Base again.', 'unauthenticated');
  }

  const retryKey = JSON.stringify([chain, options.method ?? 'GET', path.split('?')[0], headers['X-Network'] ?? headers['X-Stellar-Network'], currentUserId]);
  const remaining = (retryDeadlines.get(retryKey) ?? 0) - Date.now();
  if (remaining > 0) throw new ApiError('Please wait before trying this request again.', 'http', { status: 429, retryAfterMs: remaining });
  retryDeadlines.delete(retryKey);

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
  let responseText: string;
  try {
    const requestUrl = apiUrl(path);
    const send = async () => {
      if (protectedRequest && chain === 'base' && authentication) {
        const token = await authentication.getAccessToken();
        if (authentication !== baseAuthentication || authentication.userId !== getApiUserId())
          throw new DOMException('Account changed.', 'AbortError');
        if (!token) {
          authentication.onExpired();
          throw new ApiError('Sign in to Base again.', 'unauthenticated');
        }
        headers.Authorization = `Bearer ${token}`;
      }
      if (revision !== contextRevision) throw new DOMException('Request context changed.', 'AbortError');
      return fetch(requestUrl, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.formData ??
          (options.json !== undefined ? JSON.stringify(options.json) : undefined),
        signal: controller.signal,
        ...(chain === 'base' && protectedRequest ? { redirect: 'error' as const } : {}),
        ...(path === '/config' ? { cache: 'no-store' as const } : {}),
      });
    };
    response = await send();
    if (response.status === 401 && chain === 'base' && protectedRequest) {
      response = await send();
    }
    responseText = await response.text();
    if (revision !== contextRevision || (chain === 'base' && protectedRequest && authentication !== baseAuthentication))
      throw new DOMException('Request context changed.', 'AbortError');
    if (response.status === 401 && chain === 'base' && protectedRequest) authentication?.onExpired();
  } catch (error) {
    if (timedOut) {
      throw new ApiError('The request timed out. Try again.', 'timeout');
    }
    if (error instanceof ApiError || (error instanceof Error && error.name === 'AbortError')) throw error;
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

  const envelope = parseEnvelope(responseText);

  const retryAfter = response.headers?.get('Retry-After');
  const parsedRetryAfterMs = retryAfter
    ? /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now())
    : undefined;
  const retryAfterMs = Number.isFinite(parsedRetryAfterMs) ? parsedRetryAfterMs : undefined;
  if (response.status === 429 && retryAfterMs !== undefined && retryAfterMs > 0)
    retryDeadlines.set(retryKey, Date.now() + retryAfterMs);
  if (!response.ok || response.status === 202) {
    const serverMessage = envelopeMessage(envelope);
    throw new ApiError(
      serverMessage ?? `The request failed (${response.status}).`,
      'http',
      { status: response.status, result: envelope.result, serverMessage, retryAfterMs },
    );
  }
  if (envelope.status !== 'success' || (options.expectedStatus !== undefined && response.status !== options.expectedStatus)) {
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
