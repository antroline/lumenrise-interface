'use client';

import { getConfiguration } from '@/lib/api/config';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { ImageCropInput } from '@/components/image-crop-input';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { AppDialogContent, AppDialogHeader, AppDialogFooter } from '@/components/app-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FieldSurface, FormInput } from '@/components/form-controls';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  searchTeamCandidates, teamErrorMessage,
  type ExternalMemberInput, type TeamCandidate, type TeamMember,
} from '@/lib/api/launches/team';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { resolveApiFileUrl } from '@/lib/api/client';

export type TeamChange =
  | { kind: 'registered'; identityId: string; role: string }
  | { kind: 'external'; input: ExternalMemberInput; memberId?: string }
  | { kind: 'remove'; member: TeamMember };

export function MemberAvatar({ name, avatarUrl, identityId, memberId }: { name: string; avatarUrl: string | null; identityId?: string | null; memberId?: string }) {
  return (
    <ProfileAvatar seed={identityId || memberId || name} avatarUrl={avatarUrl} />
  );
}

export function LaunchTeamMemberDialog({ slug, network, sessionId, member, busy, capacityFull = false, onSave, onCancel }: {
  slug: string;
  network: ApiNetwork;
  sessionId: string;
  member: TeamMember | null;
  busy: boolean;
  capacityFull?: boolean;
  onSave: (change: TeamChange) => Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<'registered' | 'external'>(member?.kind ?? 'registered');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<TeamCandidate | null>(member?.kind === 'registered' ? member : null);
  const [name, setName] = useState(member?.name ?? '');
  const [role, setRole] = useState(member?.role ?? '');
  const [xAccount, setXAccount] = useState(member?.xAccount ?? '');
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState('');
  const previewUrl = useRef<string | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const candidates = useQuery({
    queryKey: ['team-candidates', network, slug, sessionId, debouncedSearch],
    queryFn: ({ signal }) => searchTeamCandidates(slug, debouncedSearch, { network, signal }),
    enabled: !member && kind === 'registered' && debouncedSearch.length >= getConfiguration().rules.team.searchMinLength && debouncedSearch.length <= getConfiguration().rules.team.searchMaxLength && debouncedSearch === search.trim(),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const searching = search.trim() !== debouncedSearch || candidates.isFetching;
  const sendsInvitation = kind === 'registered' && (!member || member.status === 'canceled');
  const blockedByCapacity = capacityFull && (!member || member.status === 'canceled');
  const photo = imagePreview || resolveApiFileUrl(member?.avatarUrl ?? null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blockedByCapacity) return;
    setError(undefined);
    if (kind === 'registered' && !selected) {
      setError('Search for and select a registered user.');
      return;
    }
    if (kind === 'external' && !member && !image) {
      setError('Upload and confirm a member photo.');
      return;
    }
    try {
      if (kind === 'registered' && selected)
        await onSave({ kind, identityId: selected.identityId, role });
      else
        await onSave({ kind: 'external', memberId: member?.memberId, input: { name, role, xAccount, image } });
    } catch (cause) { setError(teamErrorMessage(cause)); }
  }

  return (
    <AppDialogContent showCloseButton={!busy} overlayProps={{ className: 'backdrop-blur-none!' }}>
      <AppDialogHeader
        title={member ? 'Edit team member' : 'Add Team Member'}
        description={sendsInvitation ? 'They’ll appear on the team after accepting.' : !member && kind === 'external' ? 'External members are added immediately.' : undefined}
      />
      <form onSubmit={submit} aria-describedby={error ? 'team-form-error' : undefined} className="flex min-w-0 flex-col gap-5">
        <fieldset disabled={busy} className="min-w-0">
          <FieldGroup className="gap-3">
            {!member && (
              <ToggleGroup value={[kind]} disabled={busy} aria-label="Member type" onValueChange={(values) => {
                const value = values[0];
                if (value === 'registered' || value === 'external') { setKind(value); setError(undefined); }
              }}>
                <ToggleGroupItem value="registered">Registered user</ToggleGroupItem>
                <ToggleGroupItem value="external">External member</ToggleGroupItem>
              </ToggleGroup>
            )}
            {kind === 'registered' ? (
              <>
                {!member && !selected && (
                  <Field>
                    <FieldSurface>
                      <FieldLabel htmlFor="team-search" className="text-small text-muted-foreground">Find a user</FieldLabel>
                      <FormInput className="text-base font-normal placeholder:font-normal" id="team-search" maxLength={getConfiguration().rules.team.searchMaxLength} value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null); }} placeholder="Name or wallet address" autoComplete="off" />
                    </FieldSurface>
                    {search.trim().length >= getConfiguration().rules.team.searchMinLength && (
                      <div className="h-40 overflow-y-auto rounded-lg border border-border p-1" aria-label="Search results" aria-busy={searching}>
                        {searching ? <p role="status" className="p-3 text-muted-foreground">Searching…</p>
                          : candidates.isError ? <div role="alert" className="p-3"><p>{teamErrorMessage(candidates.error)}</p><Button type="button" variant="outline" size="sm" onClick={() => void candidates.refetch()}>Retry search</Button></div>
                          : candidates.data?.length ? (
                            <ul className="flex flex-col gap-1">
                              {candidates.data.map((candidate) => (
                                <li key={candidate.identityId}>
                                  <button type="button" onClick={() => setSelected(candidate)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
                                    <MemberAvatar {...candidate} />
                                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{candidate.name}</span>{candidate.xAccount && <span className="block truncate text-xs text-muted-foreground">{candidate.xAccount}</span>}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : <p role="status" className="p-3 text-muted-foreground">No users found.</p>}
                      </div>
                    )}
                  </Field>
                )}
                {selected && <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3"><MemberAvatar {...selected} /><p className="min-w-0 flex-1 truncate font-medium">{selected.name}</p>{!member && <Button type="button" variant="ghost" size="sm" onClick={() => { setSelected(null); setSearch(''); }}>Change</Button>}</div>}
              </>
            ) : (
              <>
                <Field>
                  <FieldSurface>
                    <FieldLabel htmlFor="team-name" className="text-small text-muted-foreground">Name *</FieldLabel>
                    <FormInput className="text-base font-normal placeholder:font-normal" id="team-name" minLength={getConfiguration().rules.team.nameMinLength} maxLength={getConfiguration().rules.team.nameMaxLength} value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" required />
                  </FieldSurface>
                </Field>
                <Field orientation="horizontal" className="items-center gap-3">
                  <label htmlFor="team-image" className="group relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border bg-secondary/60 transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-50">
                    {photo ? <img src={photo} alt="Member photo preview" className="size-full object-cover" /> : <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />}
                    <ImageCropInput kind="teamImage" onError={setError} id="team-image" className="sr-only" aria-label={photo ? 'Change member photo' : 'Upload member photo'} disabled={!getConfiguration().features.imageUploads} onCropped={(file) => {
                      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
                      previewUrl.current = URL.createObjectURL(file);
                      setImagePreview(previewUrl.current);
                      setImage(file);
                    }} />
                  </label>
                  <div className="min-w-0 flex-1">
                    <FieldLabel htmlFor="team-image" className="text-small text-muted-foreground">Photo{member ? '' : ' *'}</FieldLabel>
                    <label htmlFor="team-image" className="block cursor-pointer text-sm font-medium underline underline-offset-4">{photo || image ? 'Change photo' : 'Upload photo'}</label>
                    {image && <p className="mt-1 truncate text-xs text-muted-foreground" title={image.name}>{image.name}</p>}
                  </div>
                </Field>
                <Field>
                  <FieldSurface>
                    <FieldLabel htmlFor="team-x" className="text-small text-muted-foreground">X account link {getConfiguration().rules.team.externalXAccountRequired ? '*' : '(optional)'}</FieldLabel>
                    <FormInput className="text-base font-normal placeholder:font-normal" id="team-x" type="url" value={xAccount} onChange={(event) => setXAccount(event.target.value)} placeholder="https://x.com/username" maxLength={getConfiguration().rules.projectLinks.maxLength} required={getConfiguration().rules.team.externalXAccountRequired} />
                  </FieldSurface>
                </Field>
              </>
            )}
            <Field>
              <FieldSurface>
                <FieldLabel htmlFor="team-role" className="text-small text-muted-foreground">Role *</FieldLabel>
                <FormInput className="text-base font-normal placeholder:font-normal" id="team-role" minLength={getConfiguration().rules.team.roleMinLength} maxLength={getConfiguration().rules.team.roleMaxLength} value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Developer" required />
              </FieldSurface>
            </Field>
          </FieldGroup>
        </fieldset>
        {error && <p id="team-form-error" role="alert" className="text-sm text-destructive">{error}</p>}
        {blockedByCapacity && <p role="status" className="text-sm text-muted-foreground">Team full. Remove a member or invitation first.</p>}
        <AppDialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || blockedByCapacity || (kind === 'registered' && !selected)}>
            {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? 'Saving…' : sendsInvitation ? 'Send invitation' : member ? 'Save changes' : 'Add member'}
          </Button>
        </AppDialogFooter>
      </form>
    </AppDialogContent>
  );
}
