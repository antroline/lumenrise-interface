import { getConfiguration } from './config';
import { validateText, validateImage } from '../client-rules';
/**
 * Account identification and registration endpoints.
 *
 * The API verifies the user behind the authentication provider's user id
 * server-side; the client only sends the numeric `userId` (in the `X-User-Id`
 * header or the registration body). Wallet addresses are never sent as proof.
 */

import { ApiError, apiRequest, getApiUserId } from './client';

export type RegistrationStatus =
  | { registered: false; userId: string }
  | {
      registered: true;
      userId: string;
      identityId: string;
      name: string;
      avatarUrl: string | null;
    };

export type AccountProfile = {
  userId: string;
  identityId: string;
  name: string;
  avatarUrl: string | null;
  addresses: string[];
};

export type UserProfile = {
  identityId: string;
  name: string;
  avatarUrl: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function invalid(message: string): never {
  throw new ApiError(message, 'invalid-response');
}

function readUserId(value: unknown): string {
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return invalid('The server returned an invalid registration response.');
}

function readAvatarUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return invalid('The server returned an invalid profile response.');
}

/** GET /auth/status — registration check for the current provider user. */
export async function getRegistrationStatus(options?: {
  signal?: AbortSignal;
}): Promise<RegistrationStatus> {
  const result = asRecord(
    await apiRequest<unknown>('/auth/status', {
      user: true,
      signal: options?.signal,
    }),
  );
  if (!result || typeof result.registered !== 'boolean') {
    invalid('The server returned an invalid registration status.');
  }
  const userId = readUserId(result.userId);
  if (!result.registered) return { registered: false, userId };
  if (typeof result.identityId !== 'string' || !result.identityId) {
    invalid('The server returned an invalid profile response.');
  }
  if (typeof result.name !== 'string') {
    invalid('The server returned an invalid profile response.');
  }
  return {
    registered: true,
    userId,
    identityId: result.identityId,
    name: result.name,
    avatarUrl: readAvatarUrl(result.avatarUrl),
  };
}

function readAddresses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * POST /auth/register — creates the account for the current provider user.
 * JSON when no photo is chosen, multipart with exactly `userId`, `name`, and
 * `avatar` fields when one is. This endpoint does not edit existing profiles.
 */
export async function registerAccount(input: {
  name: string;
  avatar?: File | null;
  signal?: AbortSignal;
}): Promise<AccountProfile> {
  const userId = getApiUserId();
  if (!userId) {
    throw new ApiError(
      'A signed-in account is required for this request.',
      'unauthenticated',
    );
  }
  if (!getConfiguration().features.registration) throw new Error('Registration is not configured right now.');
  const rule = getConfiguration().rules.profile;
  const name = validateText(input.name, rule.nameMinLength, rule.nameMaxLength, 'Name');

  let result: unknown;
  if (input.avatar) {
    const issue = await validateImage(input.avatar, 'avatar');
    if (issue) throw new Error(issue);
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('name', name);
    formData.append('avatar', input.avatar);
    result = await apiRequest<unknown>('/auth/register', {
      method: 'POST',
      formData,
      signal: input.signal,
    });
  } else {
    result = await apiRequest<unknown>('/auth/register', {
      method: 'POST',
      json: { userId, name },
      signal: input.signal,
    });
  }

  const record = asRecord(result);
  if (!record || typeof record.name !== 'string') {
    invalid('The server returned an invalid registration response.');
  }
  if (typeof record.identityId !== 'string' || !record.identityId) {
    invalid('The server returned an invalid registration response.');
  }
  return {
    userId: readUserId(record.userId),
    identityId: record.identityId,
    name: record.name,
    avatarUrl: readAvatarUrl(record.avatarUrl),
    addresses: readAddresses(record.addresses),
  };
}

/** GET /user — the current user's profile. */
export async function getProfile(options?: {
  signal?: AbortSignal;
}): Promise<UserProfile> {
  const result = asRecord(
    await apiRequest<unknown>('/user', { user: true, signal: options?.signal }),
  );
  if (!result || typeof result.name !== 'string') {
    invalid('The server returned an invalid profile response.');
  }
  if (typeof result.identityId !== 'string' || !result.identityId) {
    invalid('The server returned an invalid profile response.');
  }
  return {
    identityId: result.identityId,
    name: result.name,
    avatarUrl: readAvatarUrl(result.avatarUrl),
  };
}

/** PUT /user/avatar — replaces the profile photo (multipart, `avatar` only). */
export async function uploadAvatar(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const issue = await validateImage(file, 'avatar');
  if (issue) throw new Error(issue);
  const formData = new FormData();
  formData.append('avatar', file);
  await apiRequest<unknown>('/user/avatar', {
    method: 'PUT',
    formData,
    user: true,
    signal: options?.signal,
  });
}

/** DELETE /user/avatar — removes the profile photo. */
export async function deleteAvatar(options?: {
  signal?: AbortSignal;
}): Promise<void> {
  await apiRequest<unknown>('/user/avatar', {
    method: 'DELETE',
    user: true,
    signal: options?.signal,
  });
}
