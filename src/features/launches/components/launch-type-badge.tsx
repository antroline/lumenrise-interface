import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function LaunchTypeBadge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-xs font-medium text-orange-800 dark:bg-orange/15 dark:text-orange-300',
        className,
      )}
    />
  );
}
