import { ApiError, apiRequest, formatByteLimit } from '../client';
import type { ApiNetwork } from './types';

export type TeamCandidate = {
  identityId: string;
  name: string;
  avatarUrl: string | null;
  xAccount: string | null;
};

type MemberProfile = Omit<TeamCandidate, 'identityId'> & { memberId: string; role: string };
export type TeamMember = MemberProfile & (
  | { kind: 'registered'; identityId: string }
  | { kind: 'external'; identityId: null }
);
export type TeamRequest = { network: ApiNetwork; signal?: AbortSignal };
export type ExternalMemberInput = { name: string; role: string; xAccount: string; image?: File };

function invalid(): never {
  throw new ApiError('The server returned invalid team information.', 'invalid-response');
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : invalid();
}
function nullableText(value: unknown): string | null {
  return value == null ? null : typeof value === 'string' ? value : invalid();
}
function entries(value: unknown, key: 'members' | 'users'): unknown[] {
  const list: unknown = Array.isArray(value) ? value : record(value)[key];
  return Array.isArray(list) ? list : invalid();
}
function profile(value: Record<string, unknown>) {
  return { name: text(value.name), avatarUrl: nullableText(value.avatarUrl), xAccount: nullableText(value.xAccount) };
}
function path(contractId: string, options: TeamRequest, suffix = '') {
  return `/launches/${encodeURIComponent(contractId)}/team${suffix}?network=${options.network}`;
}

export async function getLaunchTeam(contractId: string, options: TeamRequest): Promise<TeamMember[]> {
  const result = await apiRequest<unknown>(path(contractId, options), { user: true, signal: options.signal });
  return entries(result, 'members').map((entry) => {
    const item = record(entry);
    const common = { ...profile(item), memberId: text(item.memberId), role: text(item.role) };
    if (item.kind === 'registered') return { ...common, kind: 'registered', identityId: text(item.identityId) };
    if (item.kind === 'external' && item.identityId === null) return { ...common, kind: 'external', identityId: null };
    return invalid();
  });
}

export async function searchTeamCandidates(contractId: string, search: string, options: TeamRequest): Promise<TeamCandidate[]> {
  const result = await apiRequest<unknown>(`${path(contractId, options, '/candidates')}&search=${encodeURIComponent(search.trim())}`, { user: true, signal: options.signal });
  return entries(result, 'users').map((entry) => {
    const item = record(entry);
    return { ...profile(item), identityId: text(item.identityId) };
  });
}

function required(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter the member’s ${label}.`);
  return trimmed;
}

export function externalMemberFields(input: ExternalMemberInput) {
  const name = required(input.name, 'name');
  const role = required(input.role, 'role');
  const xAccount = required(input.xAccount, 'X link');
  let url: URL;
  try { url = new URL(xAccount); } catch { throw new Error('Enter a valid HTTPS X link.'); }
  if (xAccount.length > 2048 || url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Enter an HTTPS X link of up to 2048 characters without embedded credentials.');
  return { name, role, xAccount };
}

export async function validateTeamImage(image: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type))
    throw new Error('Choose a JPEG, PNG or WebP image.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(image); }
  catch { throw new Error('The image could not be read. Choose another image.'); }
  try {
    if (bitmap.width < 128 || bitmap.height < 128)
      throw new Error('Choose an image at least 128 × 128 pixels.');
  } finally { bitmap.close(); }
}

export async function putRegisteredTeamMember(contractId: string, identityId: string, role: string, options: TeamRequest) {
  await apiRequest<unknown>(path(contractId, options, `/${encodeURIComponent(identityId)}`), {
    method: 'PUT', user: true, json: { role: required(role, 'role') }, signal: options.signal,
  });
}

export async function saveExternalTeamMember(contractId: string, input: ExternalMemberInput, options: TeamRequest, memberId?: string) {
  const fields = externalMemberFields(input);
  if (!memberId && !input.image) throw new Error('Choose a photo for this member.');
  const endpoint = path(contractId, options, `/external${memberId ? `/${encodeURIComponent(memberId)}` : ''}`);
  const method = memberId ? 'PUT' : 'POST';
  if (input.image) {
    await validateTeamImage(input.image);
    options.signal?.throwIfAborted();
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.append(key, value);
    formData.append('image', input.image);
    await apiRequest<unknown>(endpoint, { method, user: true, formData, signal: options.signal });
  } else {
    await apiRequest<unknown>(endpoint, { method, user: true, json: fields, signal: options.signal });
  }
}

export async function removeTeamMember(contractId: string, member: TeamMember, options: TeamRequest) {
  const suffix = member.kind === 'registered'
    ? `/${encodeURIComponent(member.identityId)}` : `/external/${encodeURIComponent(member.memberId)}`;
  await apiRequest<unknown>(path(contractId, options, suffix), { method: 'DELETE', user: true, signal: options.signal });
}

export function teamErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'unauthenticated' || error.status === 401) return 'Your sign-in session has expired. Sign in again to manage this team.';
    if (error.status === 403) return 'Only the launch owner can manage this team.';
    if (error.status === 413) {
      const result = error.result && typeof error.result === 'object' ? error.result as Record<string, unknown> : null;
      const limit = typeof result?.maxBytes === 'number' ? formatByteLimit(result.maxBytes) : '';
      return limit ? `That image is too large. The current upload limit is ${limit}.` : error.serverMessage ?? 'That image exceeds the server upload limit. Choose a smaller image.';
    }
  }
  return error instanceof Error ? error.message : 'The team could not be updated. Try again.';
}
