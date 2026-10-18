'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiUserId } from '@/lib/api/client';
import {
  getLaunchTeam,
  putRegisteredTeamMember,
  removeTeamMember,
  saveExternalTeamMember,
  teamErrorMessage,
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
  contractId: string;
  network: ApiNetwork;
};

/** Mounted only for an indexed, confirmed launch. The server authorizes every request. */
export function LaunchTeam(props: LaunchTeamProps) {
  const { address, account } = useLaunchpad();
  if (address !== props.owner || account.status !== 'registered') return null;
  return (
    <OwnerLaunchTeam
      key={`${props.network}:${props.contractId}:${account.profile.userId}:${address}`}
      {...props}
      sessionId={account.profile.userId}
    />
  );
}

function OwnerLaunchTeam({
  contractId,
  network,
  sessionId,
}: LaunchTeamProps & { sessionId: string }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<{ member: TeamMember | null } | null>(
    null,
  );
  const controller = useRef<AbortController | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => current.abort();
  }, []);
  const queryKey = ['launch-team', network, contractId, sessionId];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getLaunchTeam(contractId, { network, signal }),
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
          contractId,
          change.identityId,
          change.role,
          options,
        );
      else if (change.kind === 'external')
        await saveExternalTeamMember(
          contractId,
          change.input,
          options,
          change.memberId,
        );
      else await removeTeamMember(contractId, change.member, options);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
    },
  });

  async function save(change: TeamChange) {
    if (saving.current) return;
    saving.current = true;
    try {
      await mutation.mutateAsync(change);
      setEditor(null);
    } finally {
      saving.current = false;
    }
  }

  function edit(member: TeamMember | null) {
    mutation.reset();
    setEditor({ member });
  }

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => edit(null)}
          disabled={mutation.isPending}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Team Member
        </Button>
      </div>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Loading team members"
          className="grid gap-2 sm:grid-cols-2"
        >
          <Skeleton className="h-24 rounded-xl motion-reduce:animate-none" />
          <Skeleton className="h-24 rounded-xl motion-reduce:animate-none" />
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
              className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"
            >
              <MemberAvatar {...member} />
              <div className="min-w-0 flex-1 py-0.5">
                <h3
                  className="truncate text-sm font-semibold"
                  title={member.name}
                >
                  {member.name}
                </h3>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
                  {member.role}
                </p>
                {member.xAccount && safeXLink(member.xAccount) && (
                  <a
                    href={member.xAccount}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-sm text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    X profile
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                    <span className="sr-only"> for {member.name}</span>
                  </a>
                )}
              </div>
              <div className="-mr-1 flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 text-muted-foreground hover:text-foreground"
                  disabled={mutation.isPending}
                  onClick={() => edit(member)}
                  aria-label={`Edit ${member.name}`}
                  title={`Edit ${member.name}`}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ kind: 'remove', member })}
                  aria-label={`Remove ${member.name}`}
                  title={`Remove ${member.name}`}
                >
                  {mutation.isPending &&
                  mutation.variables?.kind === 'remove' &&
                  mutation.variables.member.memberId === member.memberId ? (
                    <LoaderCircle
                      className="size-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  )}
                </Button>
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
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setEditor(null);
        }}
      >
        {editor && (
          <LaunchTeamMemberDialog
            key={editor.member?.memberId ?? 'new'}
            contractId={contractId}
            network={network}
            sessionId={sessionId}
            member={editor.member}
            busy={mutation.isPending}
            onSave={save}
            onCancel={() => setEditor(null)}
          />
        )}
      </Dialog>
    </div>
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
