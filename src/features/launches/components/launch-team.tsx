'use client';

import { getConfiguration } from '@/lib/api/config';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ellipsis, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { XLogoIcon } from '@/components/brand-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, getApiUserId } from '@/lib/api/client';
import {
  getLaunchTeam,
  putRegisteredTeamMember,
  removeTeamMember,
  saveExternalTeamMember,
  teamErrorMessage,
  teamCapacity,
  type TeamMember,
} from '@/lib/api/launches/team';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { useLaunchpad } from '@/lib/launchpad';
import {
  LaunchTeamMemberDialog,
  MemberAvatar,
  type TeamChange,
} from './launch-team-member-dialog';

type LaunchTeamProps = {
  owner: string;
  slug?: string;
  network: ApiNetwork;
  members?: TeamMember[];
};

/** Mounted only for an indexed, confirmed launch. The server authorizes every request. */
export function LaunchTeam(props: LaunchTeamProps) {
  const { address, account } = useLaunchpad();
  if (!props.slug || address !== props.owner || account.status !== 'registered') {
    if (!props.members?.length) return null;
    return (
      <ul className="mb-2 grid gap-2 sm:grid-cols-2" aria-label="Team members">
        {props.members.map((member) => (
          <li key={member.memberId} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground">
            <MemberIdentity member={member} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <OwnerLaunchTeam
      key={`${props.network}:${props.slug}:${account.profile.userId}:${address}`}
      {...props}
      slug={props.slug}
      sessionId={account.profile.userId}
    />
  );
}

function OwnerLaunchTeam({
  slug,
  network,
  sessionId,
}: LaunchTeamProps & { slug: string; sessionId: string }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<{ member: TeamMember | null } | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => current.abort();
  }, []);
  const queryKey = ['launch-team', network, slug, sessionId];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getLaunchTeam(slug, { network, signal }),
    staleTime: 15_000,
    gcTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (change: TeamChange) => {
      if (
        getApiUserId() !== sessionId ||
        !controller.current ||
        controller.current.signal.aborted
      )
        throw new Error(
          'Your account changed. Reopen the team editor and try again.',
        );
      const options = { network, signal: controller.current.signal };
      if (change.kind === 'registered')
        await putRegisteredTeamMember(
          slug,
          change.identityId,
          change.role,
          options,
        );
      else if (change.kind === 'external')
        await saveExternalTeamMember(
          slug,
          change.input,
          options,
          change.memberId,
        );
      else await removeTeamMember(slug, change.member, options);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ['launch', network, slug, 'detail'] }),
      ]);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409)
        await client.invalidateQueries({ queryKey });
    },
  });

  async function save(change: TeamChange) {
    if (saving.current) return;
    saving.current = true;
    try {
      await mutation.mutateAsync(change);
      setEditorOpen(false);
    } finally {
      saving.current = false;
    }
  }

  function edit(member: TeamMember | null) {
    mutation.reset();
    setEditor({ member });
    setEditorOpen(true);
  }

  return (
    <div className="mb-2 flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => edit(null)}
          disabled={mutation.isPending || query.isError || !query.data || teamCapacity(query.data) >= Math.min(6, getConfiguration().rules.team.maxMembers)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Team Member
        </Button>
        {query.data && <p className="text-xs text-muted-foreground">{teamCapacity(query.data)} / {Math.min(6, getConfiguration().rules.team.maxMembers)} people · Includes owner and pending invitations</p>}
      </div>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Loading team members"
          className="grid gap-2 sm:grid-cols-2"
        >
          <Skeleton className="h-18 rounded-xl motion-reduce:animate-none" />
          <Skeleton className="h-18 rounded-xl motion-reduce:animate-none" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{teamErrorMessage(query.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Reload team
          </Button>
        </div>
      ) : null}

      {query.data && query.data.length > 0 && (
        <ul
          className="grid gap-2 sm:grid-cols-2"
          aria-label="Team members"
          aria-busy={mutation.isPending}
        >
          {query.data.map((member) => (
            <li
              key={member.memberId}
              className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MemberIdentity member={member} showStatus />
              </div>
              <div className="-mr-1 flex shrink-0 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={mutation.isPending}
                    aria-label={`Actions for ${member.name}`}
                    render={<Button type="button" variant="ghost" size="icon-sm" />}
                  >
                    {mutation.isPending && mutation.variables?.kind === 'remove' && mutation.variables.member.memberId === member.memberId
                      ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <Ellipsis aria-hidden="true" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-36">
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled={mutation.isPending} onClick={() => edit(member)} aria-label={`Edit ${member.name}`}>
                        <Pencil aria-hidden="true" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate({ kind: 'remove', member })} aria-label={`Remove ${member.name}`}>
                        <Trash2 aria-hidden="true" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}
      {mutation.isError && mutation.variables?.kind === 'remove' && (
        <p role="alert" className="text-sm text-destructive">
          {teamErrorMessage(mutation.error)}
        </p>
      )}
      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setEditorOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (!open && !editorOpen) setEditor(null);
        }}
      >
        {editor && (
          <LaunchTeamMemberDialog
            key={editor.member?.memberId ?? 'new'}
            slug={slug}
            network={network}
            sessionId={sessionId}
            member={editor.member}
            busy={mutation.isPending}
            capacityFull={!query.data || query.isError || teamCapacity(query.data) >= Math.min(6, getConfiguration().rules.team.maxMembers)}
            onSave={save}
            onCancel={() => setEditorOpen(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function MemberIdentity({ member, showStatus = false }: { member: TeamMember; showStatus?: boolean }) {
  return (
    <>
      <MemberAvatar {...member} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <h3 className="truncate text-sm leading-tight font-semibold" title={member.name}>
              {member.name}
            </h3>
            {member.xAccount && safeXLink(member.xAccount) && (
              <a href={member.xAccount} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on X`} className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground after:absolute after:-inset-1 hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <XLogoIcon className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
          {showStatus && <Badge size="sm" className="before:size-1.5 before:rounded-full before:bg-current" variant={member.status === 'active' ? 'ok' : member.status === 'pending' ? 'warn' : 'soft'}>{member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Canceled'}</Badge>}
        </div>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {member.role}
        </p>
      </div>
    </>
  );
}

function safeXLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
