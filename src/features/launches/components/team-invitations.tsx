'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ApiError, getApiUserId, getApiChain } from '@/lib/api/client';
import { routeNetwork } from '@/lib/chain-address';
import { getTeamInvitations, invitationErrorMessage, respondToTeamInvitation, type TeamInvitation } from '@/lib/api/launches/team';
import { useLaunchpad } from '@/lib/launchpad';
import { API_NETWORK } from '@/lib/api/client';

export function TeamInvitations() {
  const { account } = useLaunchpad();
  if (account.status !== 'registered') return null;
  return <PendingInvitations key={`${API_NETWORK}:${account.profile.userId}`} sessionId={account.profile.userId} />;
}

function PendingInvitations({ sessionId }: { sessionId: string }) {
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const responding = useRef(false);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => current.abort();
  }, []);
  const queryKey = ['team-invitations', getApiChain(), API_NETWORK, sessionId];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getTeamInvitations({ network: API_NETWORK, signal }),
    staleTime: 15_000,
    gcTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async ({ invitation, status }: { invitation: TeamInvitation; status: 'active' | 'canceled' }) => {
      if (responding.current) throw new Error('An invitation response is already being sent.');
      if (getApiUserId() !== sessionId || !controller.current || controller.current.signal.aborted)
        throw new Error('Your account changed. Reopen invitations and try again.');
      if (!invitation.slug) throw new Error('This project page is not available yet. Reload invitations later.');
      responding.current = true;
      try {
        await respondToTeamInvitation(invitation.slug, status, { network: invitation.network, signal: controller.current.signal });
      } finally {
        responding.current = false;
      }
    },
    onSuccess: async (_, { invitation }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ['launch', getApiChain(), invitation.network, invitation.slug] }),
        client.invalidateQueries({ queryKey: ['launch-team', getApiChain(), invitation.network, invitation.slug] }),
      ]);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409)
        await client.invalidateQueries({ queryKey });
    },
  });
  const invitations = query.data?.filter((invitation) => invitation.status === 'pending');

  return <div className="flex flex-col gap-3">
    {query.isPending && <p role="status" className="text-small text-muted-foreground">Loading invitations…</p>}
    {query.isError && <div role="alert" className="flex flex-wrap items-center gap-3"><p className="text-small text-destructive">{invitationErrorMessage(query.error)}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reload invitations</Button></div>}
    {!query.isPending && !query.isError && !invitations?.length && <p className="text-small text-muted-foreground">No pending team invitations.</p>}
    {invitations?.length ? <ul aria-label="Pending team invitations" aria-busy={mutation.isPending} className="flex flex-col gap-3">
      {invitations.map((invitation) => <li key={`${invitation.network}:${invitation.memberId}`} className="flex min-w-0 flex-wrap items-center gap-3 border-t py-3">
        <div className="min-w-0 flex-1 basis-48">
          {invitation.slug ? <Link href={`/projects/${encodeURIComponent(invitation.slug)}?network=${routeNetwork(invitation.network)}`} className="block truncate text-ui font-medium underline underline-offset-4">{invitation.slug}</Link> : <p className="text-small text-muted-foreground">Project page unavailable</p>}
          <p className="break-words text-small text-muted-foreground">{invitation.role} · {invitation.network === 'public' ? 'Mainnet' : 'Testnet'}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={mutation.isPending || !invitation.slug} onClick={() => mutation.mutate({ invitation, status: 'active' })}>Accept</Button>
          <Button variant="outline" size="sm" disabled={mutation.isPending || !invitation.slug} onClick={() => mutation.mutate({ invitation, status: 'canceled' })}>Decline</Button>
        </div>
      </li>)}
    </ul> : null}
    {mutation.isError && <p role="alert" className="text-small text-destructive">{invitationErrorMessage(mutation.error)}</p>}
    {mutation.isSuccess && <p role="status" className="text-small text-muted-foreground">{mutation.variables.status === 'active' ? 'Invitation accepted.' : 'Invitation declined.'}</p>}
  </div>;
}
