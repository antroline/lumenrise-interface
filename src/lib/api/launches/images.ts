import { isLaunchSlug, projectNameError } from '../../launch-slug';
import { getConfiguration } from '../config';
import { validProjectLink, validateImage } from '../../client-rules';
/**
 * Bonding Curve prelaunch endpoints.
 *
 * `POST /launches/prelaunch` stores a description, logo and optional project links for the signed-in
 * user's wallet before the launch transaction; the returned `publicUrl` goes
 * into the contract's `metadata.logo` unchanged. `GET /launches/prelaunch/:id`
 * reports the image lifecycle to its owner, so a retry can reuse a still
 * valid upload instead of uploading again.
 */

import { ApiError, apiRequest, formatByteLimit } from '../client';
import type {
  ApiNetwork,
  LaunchImageInfo,
  LaunchImageStatus,
  UploadedLaunchImage,
} from './types';

const IMAGE_STATUSES: readonly LaunchImageStatus[] = [
  'pending',
  'cleanup_ready',
  'deleting',
  'finalized',
  'expired',
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function invalid(message: string): never {
  throw new ApiError(message, 'invalid-response');
}

function readString(value: unknown, message: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  invalid(message);
}

function readOptionalString(value: unknown, message: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  invalid(message);
}

function readStatus(value: unknown): LaunchImageStatus {
  if (
    typeof value === 'string' &&
    (IMAGE_STATUSES as readonly string[]).includes(value)
  ) {
    return value as LaunchImageStatus;
  }
  invalid('The server returned an invalid image response.');
}

function readNetwork(value: unknown): ApiNetwork {
  if (value === 'testnet' || value === 'public') return value;
  invalid('The server returned an invalid image response.');
}

function readUpload(result: unknown): UploadedLaunchImage {
  const record = asRecord(result);
  if (!record) invalid('The server returned an invalid image response.');
  if (!isLaunchSlug(record.slug)) invalid('The server returned an invalid project slug.');
  return {
    name: readString(record.name, 'The server returned an invalid project name.'),
    slug: readString(record.slug, 'The server returned an invalid project slug.'),
    imageId: readString(
      record.imageId,
      'The server returned an invalid image response.',
    ),
    publicUrl: readString(
      record.publicUrl,
      'The server returned an invalid image response.',
    ),
    status: readStatus(record.status),
  };
}

/**
 * Converts the wizard's stored image (a base64 data URL) back into a file for
 * the multipart upload. Only the still image formats the server accepts are
 * produced.
 */
export function fileFromDataUrl(dataUrl: string): File {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match || !getConfiguration().rules.images.mimeTypes.includes(match[1]))
    throw new Error('Choose the project image again before launching.');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1].replace(/[^a-z0-9]/gi, '');
  return new File([bytes], `logo.${extension}`, { type: match[1] });
}

/**
 * POST /launches/prelaunch — multipart with `name`, `description`, `network`, `ownerAddress`,
 * one `image` file, and optional links stored by the server for confirmed
 * launch metadata. Identified by `X-User-Id`; the FormData boundary is
 * left to the browser.
 */
export async function uploadLaunchImage(input: {
  name: string;
  description: string;
  network: ApiNetwork;
  ownerAddress: string;
  image: File;
  website?: string;
  xAccount?: string;
  signal?: AbortSignal;
}): Promise<UploadedLaunchImage> {
  const nameError = projectNameError(input.name);
  if (nameError) throw new Error(nameError);
  const description = input.description.trim();
  if (!description || description.length > 10_000)
    throw new Error('Enter a project description of 1 to 10000 characters.');
  const imageError = await validateImage(input.image, 'tokenImage');
  if (imageError) throw new Error(imageError);
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('description', description);
  formData.append('network', input.network);
  formData.append('ownerAddress', input.ownerAddress);
  formData.append('image', input.image);
  for (const field of ['website', 'xAccount'] as const) {
    const value = input[field]?.trim();
    if (!validProjectLink(value ?? '', getConfiguration().rules.projectLinks[field === 'website' ? 'websiteRequired' : 'xAccountRequired'])) throw new Error(`Enter a valid ${field} link.`);
    if (value) formData.append(field, value);
  }
  return readUpload(
    await apiRequest<unknown>('/launches/prelaunch', {
      method: 'POST',
      formData,
      user: true,
      network: input.network,
      signal: input.signal,
    }),
  );
}

/** GET /launches/prelaunch/:imageId — lifecycle of an owned upload. */
export async function getLaunchImage(
  imageId: string,
  options?: { signal?: AbortSignal },
): Promise<LaunchImageInfo> {
  const record = asRecord(
    await apiRequest<unknown>(
      `/launches/prelaunch/${encodeURIComponent(imageId)}`,
      { user: true, signal: options?.signal },
    ),
  );
  if (!record) invalid('The server returned an invalid image response.');
  const shapeMessage = 'The server returned an invalid image response.';
  return {
    name: readString(record.name, shapeMessage),
    slug: readOptionalString(record.slug, shapeMessage),
    imageId: readString(record.imageId, shapeMessage),
    publicUrl: readString(record.publicUrl, shapeMessage),
    status: readStatus(record.status),
    network: readNetwork(record.network),
    ownerAddress: readString(record.ownerAddress, shapeMessage),
    launchContractId: readOptionalString(record.launchContractId, shapeMessage),
    assetContractId: readOptionalString(record.assetContractId, shapeMessage),
    cleanupReadyAt: readOptionalString(record.cleanupReadyAt, shapeMessage),
    expiredAt: readOptionalString(record.expiredAt, shapeMessage),
  };
}

function tooLargeMessage(error: ApiError): string {
  const result = error.result;
  const maxBytes =
    result &&
    typeof result === 'object' &&
    typeof (result as { maxBytes?: unknown }).maxBytes === 'number'
      ? (result as { maxBytes: number }).maxBytes
      : null;
  return maxBytes
    ? `That image is too large. The current limit is ${formatByteLimit(maxBytes)}.`
    : 'That image is too large for the current server limit.';
}

/** Maps image endpoint failures to the message shown in the launch dialog. */
export function launchImageErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'unauthenticated') {
      return 'Sign in and finish setting up your account before launching.';
    }
    if (error.code === 'http') {
      switch (error.status) {
        case 400:
          return (
            error.serverMessage ??
            'Check the image, network, and wallet address, then try again.'
          );
        case 401:
          return 'Finish setting up your account before launching.';
        case 403:
          return 'This wallet is not linked to your account. Connect the wallet you registered with.';
        case 409:
          return 'This project name is already taken on this network. Choose another name.';
        case 413:
          return tooLargeMessage(error);
        case 503:
          return 'Image storage is unavailable right now. Try again in a moment.';
        default:
          return error.message;
      }
    }
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : 'The project image could not be uploaded. Try again.';
}
