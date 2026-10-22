import { requireLaunchSlug } from '../../launch-slug';
import { getConfiguration } from '../config';
import { validProjectLink, validateText, validateImage } from '../../client-rules';
import { ApiError, apiRequest, formatByteLimit } from '../client';
import type { ApiNetwork } from './types';

export type TeamCandidate = {
  identityId: string;
  name: string;
  avatarUrl: string | null;
  xAccount: string | null;
};

export type TeamStatus = 'active' | 'pending' | 'canceled';
type MemberProfile = Omit<TeamCandidate, 'identityId'> & { memberId: string; role: string; status: TeamStatus };
export type TeamMember = MemberProfile & (
  | { kind: 'registered'; identityId: string }
  | { kind: 'external'; identityId: null }
);
export type PublicTeamMember = TeamMember | {
  kind: 'owner';
  memberId: null;
  identityId: string | null;
  address: string;
  name: string | null;
  avatarUrl: string | null;
  xAccount: string | null;
  role: string;
};
export type TeamRequest = { network: ApiNetwork; signal?: AbortSignal };
export type TeamInvitation = { memberId: string; network: ApiNetwork; contractId: string; slug: string | null; role: string; status: TeamStatus };
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
function entries(value: unknown, key: 'members' | 'users' | 'invitations'): unknown[] {
  const list: unknown = Array.isArray(value) ? value : record(value)[key];
  return Array.isArray(list) ? list : invalid();
}
function teamStatus(value: unknown): TeamStatus {
  return value === 'active' || value === 'pending' || value === 'canceled' ? value : invalid();
}

export function teamCapacity(members: TeamMember[]) {
  return 1 + members.filter((member) => member.status === 'active' || member.status === 'pending').length;
}

export async function getTeamInvitations(options: TeamRequest): Promise<TeamInvitation[]> {
  const result = await apiRequest<unknown>(`/launches/team/invitations?network=${options.network}`, { user: true, signal: options.signal });
  return entries(result, 'invitations').map((entry) => {
    const item = record(entry);
    if (item.network !== 'testnet' && item.network !== 'public') return invalid();
    return { memberId: text(item.memberId), network: item.network, contractId: text(item.contractId), slug: item.slug == null ? null : text(item.slug), role: text(item.role), status: teamStatus(item.status) };
  });
}

export async function respondToTeamInvitation(slug: string, status: 'active' | 'canceled', options: TeamRequest) {
  if (status !== 'active' && status !== 'canceled') throw new Error('Choose Accept or Decline.');
  await apiRequest<unknown>(path(slug, options, '/invitation'), {
    method: 'PATCH', user: true, json: { status }, signal: options.signal,
  });
}

export function invitationErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'Only the invited user can respond to this invitation.';
  if (error instanceof ApiError && (error.status === 401 || error.code === 'unauthenticated')) return 'Your sign-in session has expired. Sign in again to respond.';
  return teamErrorMessage(error);
}
function profile(value: Record<string, unknown>) {
  return { name: text(value.name), avatarUrl: nullableText(value.avatarUrl), xAccount: nullableText(value.xAccount) };
}
function path(slug: string, options: TeamRequest, suffix = '') {
  requireLaunchSlug(slug);
  return `/launches/${encodeURIComponent(slug)}/team${suffix}?network=${options.network}`;
}

export async function getLaunchTeam(slug: string, options: TeamRequest): Promise<TeamMember[]> {
  const result = await apiRequest<unknown>(path(slug, options), { user: true, signal: options.signal });
  return entries(result, 'members').map(decodeTeamMember);
}

function decodeTeamMember(entry: unknown): TeamMember {
  const item = record(entry);
  const common = { ...profile(item), memberId: text(item.memberId), role: text(item.role), status: teamStatus(item.status) };
  if (item.kind === 'registered') return { ...common, kind: 'registered', identityId: text(item.identityId) };
  if (item.kind === 'external' && item.identityId === null) return { ...common, kind: 'external', identityId: null };
  return invalid();
}

export function decodePublicTeamMember(entry: unknown): PublicTeamMember {
  const item = record(entry);
  if (item.kind !== 'owner') return decodeTeamMember(item);
  if (item.memberId !== null) return invalid();
  return {
    kind: 'owner', memberId: null, identityId: nullableText(item.identityId),
    address: text(item.address), name: nullableText(item.name),
    avatarUrl: nullableText(item.avatarUrl), xAccount: nullableText(item.xAccount),
    role: text(item.role),
  };
}

export async function searchTeamCandidates(slug: string, search: string, options: TeamRequest): Promise<TeamCandidate[]> {
  const rule = getConfiguration().rules.team;
  validateText(search, rule.searchMinLength, rule.searchMaxLength, 'Search');
  const result = await apiRequest<unknown>(`${path(slug, options, '/candidates')}&search=${encodeURIComponent(search.trim())}`, { user: true, signal: options.signal });
  return entries(result, 'users').map((entry) => {
    const item = record(entry);
    return { ...profile(item), identityId: text(item.identityId) };
  });
}

function required(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter the member’s ${label}.`);
  const rule = getConfiguration().rules.team;
  return validateText(trimmed, label === 'name' ? rule.nameMinLength : rule.roleMinLength, label === 'name' ? rule.nameMaxLength : rule.roleMaxLength, label);
}

export function externalMemberFields(input: ExternalMemberInput) {
  const name = required(input.name, 'name');
  const role = required(input.role, 'role');
  const xAccount = input.xAccount.trim();
  if (!validProjectLink(xAccount, getConfiguration().rules.team.externalXAccountRequired)) throw new Error('Enter a valid X link.');
  return { name, role, xAccount };
}

export async function validateTeamImage(image: File) {
  const issue = await validateImage(image, 'teamImage');
  if (issue) throw new Error(issue);
}

export async function putRegisteredTeamMember(slug: string, identityId: string, role: string, options: TeamRequest) {
  await apiRequest<unknown>(path(slug, options, `/${encodeURIComponent(identityId)}`), {
    method: 'PUT', user: true, json: { role: required(role, 'role') }, signal: options.signal,
  });
}

export async function saveExternalTeamMember(slug: string, input: ExternalMemberInput, options: TeamRequest, memberId?: string) {
  const fields = externalMemberFields(input);
  if (!memberId && !input.image) throw new Error('Choose a photo for this member.');
  const endpoint = path(slug, options, `/external${memberId ? `/${encodeURIComponent(memberId)}` : ''}`);
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

export async function removeTeamMember(slug: string, member: TeamMember, options: TeamRequest) {
  const suffix = member.kind === 'registered'
    ? `/${encodeURIComponent(member.identityId)}` : `/external/${encodeURIComponent(member.memberId)}`;
  await apiRequest<unknown>(path(slug, options, suffix), { method: 'DELETE', user: true, signal: options.signal });
}

export function teamErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return error.serverMessage ?? 'The team has changed or is full. Review the refreshed team and try again.';
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
