'use client';

import { TradeTooltipText } from '../trading/trade-tooltip';
import { ProfileAvatar } from '@/components/profile-avatar';
import type { PublicTeamMember } from '@/lib/api/launches/team';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { CopyAddress, ExplorerLink } from './launch-project-links';

/** The founding wallet and its public profile, when published by the API. */
export function LaunchCreator({
  owner,
  network,
  profile,
}: {
  owner: string;
  network: ApiNetwork;
  currentId: string;
  profile?: Extract<PublicTeamMember, { kind: 'owner' }>;
}) {
  return (
    <div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <article
          aria-label="Founder"
          className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0 overflow-hidden rounded-xl">
              <ProfileAvatar seed={owner} avatarUrl={profile?.avatarUrl} radius={0} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm leading-tight font-semibold">
                <TradeTooltipText content={owner}>
                  {profile?.name || `${owner.slice(0, 6)}…${owner.slice(-6)}`}
                </TradeTooltipText>
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <TradeTooltipText content="The wallet that deployed this launch.">
                  Founder
                </TradeTooltipText>
              </p>
            </div>
          </div>
          <footer className="-mr-1 flex shrink-0 items-center">
            <CopyAddress
              address={owner}
              label="creator address"
              showAddress={false}
            />
            <ExplorerLink
              address={owner}
              network={network}
              label="creator account"
            />
          </footer>
        </article>
      </div>

    </div>
  );
}
