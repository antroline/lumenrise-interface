import { getConfiguration } from './config';
import { validateText, validateImage } from '../client-rules';
/**
 * Account identification and registration endpoints.
 *
 * The API verifies the user behind the authentication provider's user id
 * server-side. Resolution and registration send the current userId/address
 * pair for verification; subsequent requests retain that userId in X-User-Id.
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

/** POST /auth/resolve — verifies and links the current Blux login to an identity. */
export async function resolveAccount(input: {
  userId: string;
  address: string;
  signal?: AbortSignal;
}): Promise<RegistrationStatus> {
  const result = asRecord(await apiRequest<unknown>('/auth/resolve', {
    method: 'POST',
    json: { userId: input.userId, address: input.address },
    signal: input.signal,
  }));
  if (!result || typeof result.registered !== 'boolean') {
    invalid('The server returned an invalid identity resolution.');
  }
  // A linked identity may have an older provider ID. Always retain this login's ID.
  const userId = input.userId;
  if (!result.registered) return { registered: false, userId };
  if (typeof result.identityId !== 'string' || !result.identityId ||
      (result.name != null && typeof result.name !== 'string')) {
    invalid('The server returned an invalid profile response.');
  }
  return {
    registered: true,
    userId,
    identityId: result.identityId,
    name: result.name ?? '',
    avatarUrl: readAvatarUrl(result.avatarUrl),
  };
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
 * JSON when no photo is chosen, multipart when one is included.
 */
export async function registerAccount(input: {
  address: string;
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
    formData.append('address', input.address);
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
      json: { userId, address: input.address, name },
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
    userId,
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
  return decodeUserProfile(result);
}

function decodeUserProfile(value: unknown): UserProfile {
  const result = asRecord(value);
  if (!result || (result.name !== null && typeof result.name !== 'string')) {
    invalid('The server returned an invalid profile response.');
  }
  if (typeof result.identityId !== 'string' || !result.identityId) {
    invalid('The server returned an invalid profile response.');
  }
  return {
    identityId: result.identityId,
    name: result.name ?? '',
    avatarUrl: readAvatarUrl(result.avatarUrl),
  };
}

export type ProfileUpdateInput = { name?: string; avatar?: File };

/** PUT /user/avatar — updates only the supplied profile fields in one multipart request. */
export async function updateProfile(
  input: ProfileUpdateInput,
  options?: { signal?: AbortSignal },
): Promise<UserProfile> {
  if (input.name === undefined && !input.avatar) throw new Error('Change your name or photo before saving.');
  const formData = new FormData();
  if (input.name !== undefined) formData.append('name', validateText(input.name, 1, 80, 'Name'));
  if (input.avatar) {
    const issue = await validateImage(input.avatar, 'avatar');
    if (issue) throw new Error(issue);
    formData.append('avatar', input.avatar);
  }
  return decodeUserProfile(await apiRequest<unknown>('/user/avatar', {
    method: 'PUT',
    formData,
    user: true,
    signal: options?.signal,
  }));
}

/** Kept for callers that only replace the profile photo. */
export async function uploadAvatar(file: File, options?: { signal?: AbortSignal }): Promise<void> {
  await updateProfile({ avatar: file }, options);
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
