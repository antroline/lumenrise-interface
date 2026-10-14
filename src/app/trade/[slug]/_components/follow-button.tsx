'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLaunchpad } from '@/lib/launchpad';

export function FollowButton({ name }: { name: string }) {
  const { notify } = useLaunchpad();
  const [following, setFollowing] = useState(true);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={following}
      onClick={() => {
        setFollowing((current) => !current);
        notify(
          following
            ? `Unfollowed ${name}.`
            : `Following ${name}. Updates will appear in your feed.`,
        );
      }}
    >
      <Star data-icon="inline-start" />
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
