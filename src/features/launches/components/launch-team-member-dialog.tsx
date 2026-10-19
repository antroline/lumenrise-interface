'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, LoaderCircle, Search } from 'lucide-react';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { AppDialogContent, AppDialogHeader, AppDialogFooter } from '@/components/app-dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  searchTeamCandidates, teamErrorMessage,
  type ExternalMemberInput, type TeamCandidate, type TeamMember,
} from '@/lib/api/launches/team';
import type { ApiNetwork } from '@/lib/api/launches/types';

export type TeamChange =
  | { kind: 'registered'; identityId: string; role: string }
  | { kind: 'external'; input: ExternalMemberInput; memberId?: string }
  | { kind: 'remove'; member: TeamMember };

export function MemberAvatar({ name, avatarUrl, identityId, memberId }: { name: string; avatarUrl: string | null; identityId?: string | null; memberId?: string }) {
  return (
    <ProfileAvatar seed={identityId || memberId || name} avatarUrl={avatarUrl} />
  );
}

export function LaunchTeamMemberDialog({ contractId, network, sessionId, member, busy, onSave, onCancel }: {
  contractId: string;
  network: ApiNetwork;
  sessionId: string;
  member: TeamMember | null;
  busy: boolean;
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
  const [error, setError] = useState<string>();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const candidates = useQuery({
    queryKey: ['team-candidates', network, contractId, sessionId, debouncedSearch],
    queryFn: ({ signal }) => searchTeamCandidates(contractId, debouncedSearch, { network, signal }),
    enabled: !member && kind === 'registered' && !!debouncedSearch && debouncedSearch === search.trim(),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const searching = search.trim() !== debouncedSearch || candidates.isFetching;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(undefined);
    if (kind === 'registered' && !selected) {
      setError('Search for and select a registered user.');
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
    <AppDialogContent showCloseButton={!busy}>
      <AppDialogHeader
        title={member ? 'Edit team member' : 'Add Team Member'}
        description="Members appear immediately. Roles describe their work and do not grant management access."
      />
      <form onSubmit={submit} aria-describedby={error ? 'team-form-error' : undefined} className="flex min-w-0 flex-col gap-5">
        <fieldset disabled={busy} className="min-w-0">
          <FieldGroup>
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
                {!member && (
                  <Field>
                    <FieldLabel htmlFor="team-search">Find a user</FieldLabel>
                    <Input id="team-search" value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null); }} placeholder="Name or full Stellar wallet address" autoComplete="off" />
                    <FieldDescription>Search by partial name or paste a full wallet address.</FieldDescription>
                    {search.trim() && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-1" aria-label="Search results" aria-busy={searching}>
                        {searching ? <p role="status" className="p-3 text-muted-foreground">Searching users…</p>
                          : candidates.isError ? <div role="alert" className="p-3"><p>{teamErrorMessage(candidates.error)}</p><Button type="button" variant="outline" size="sm" onClick={() => void candidates.refetch()}>Retry search</Button></div>
                          : candidates.data?.length ? (
                            <ul className="flex flex-col gap-1">
                              {candidates.data.map((candidate) => (
                                <li key={candidate.identityId}>
                                  <button type="button" aria-pressed={selected?.identityId === candidate.identityId} onClick={() => setSelected(candidate)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground aria-pressed:bg-secondary">
                                    <MemberAvatar {...candidate} />
                                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{candidate.name}</span><span className="block truncate text-xs text-muted-foreground">{candidate.xAccount || 'No X connection'}</span></span>
                                    {selected?.identityId === candidate.identityId && <Check className="size-4 shrink-0" aria-hidden="true" />}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : <p role="status" className="p-3 text-muted-foreground">No users found. Try another name or wallet address.</p>}
                      </div>
                    )}
                  </Field>
                )}
                {selected && <div className="flex items-center gap-3 rounded-xl bg-secondary p-3"><MemberAvatar {...selected} /><div className="min-w-0"><p className="truncate font-medium">{selected.name}</p><p className="text-xs text-muted-foreground">Name, photo and X come from their profile.</p></div></div>}
                {!selected && !search && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Search className="size-4" aria-hidden="true" />Select a user to add them to this launch.</p>}
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="team-name">Name *</FieldLabel>
                  <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Member’s full name" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="team-image">Photo{member ? '' : ' *'}</FieldLabel>
                  <Input id="team-image" type="file" accept="image/jpeg,image/png,image/webp" required={!member && !image} onChange={(event) => setImage(event.target.files?.[0])} aria-describedby={image ? 'team-image-hint team-selected-image' : 'team-image-hint'} />
                  <FieldDescription id="team-image-hint">JPEG, PNG or WebP, at least 128 × 128 pixels. {member ? 'Leave unchanged to keep the current photo.' : 'The server enforces its upload size limit.'}</FieldDescription>
                  {image && <FieldDescription id="team-selected-image">Selected: {image.name}</FieldDescription>}
                  {member && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MemberAvatar {...member} />Current photo</div>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="team-x">X account link *</FieldLabel>
                  <Input id="team-x" type="url" value={xAccount} onChange={(event) => setXAccount(event.target.value)} placeholder="https://x.com/username" maxLength={2048} required />
                </Field>
              </>
            )}
            <Field>
              <FieldLabel htmlFor="team-role">Role *</FieldLabel>
              <Input id="team-role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Developer" required />
            </Field>
          </FieldGroup>
        </fieldset>
        {error && <p id="team-form-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <AppDialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || (kind === 'registered' && !selected)}>
            {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? 'Saving…' : member ? 'Save changes' : 'Add member'}
          </Button>
        </AppDialogFooter>
      </form>
    </AppDialogContent>
  );
}
