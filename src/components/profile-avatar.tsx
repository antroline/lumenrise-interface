'use client';

import { Blockie } from '@/components/blockie';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveApiFileUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/** Uploaded profile photo, with the site's generated avatar while unavailable. */
export function ProfileAvatar({
  seed,
  avatarUrl,
  size = 44,
  radius = 12,
  className,
}: {
  seed: string;
  avatarUrl?: string | null;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const src = resolveApiFileUrl(avatarUrl ?? null);
  return (
    <Avatar
      className={cn('overflow-hidden after:rounded-[inherit]', className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {src && <AvatarImage src={src} alt="" className="rounded-[inherit]" />}
      <AvatarFallback className="rounded-[inherit]">
        <Blockie seed={seed} size={size} radius={radius} />
      </AvatarFallback>
    </Avatar>
  );
}
