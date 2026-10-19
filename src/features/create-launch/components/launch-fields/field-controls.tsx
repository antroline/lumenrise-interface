import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const launchFieldSurfaceClassName =
  'rounded-lg border border-transparent bg-secondary/60 px-4 py-2 studio-compact:py-1.5 transition-[box-shadow,background-color] focus-within:ring-2 focus-within:ring-foreground/15 motion-reduce:transition-none';

export function FieldSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn(launchFieldSurfaceClassName, className)} {...props} />
  );
}

export function LaunchInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        'h-9 studio-compact:h-8 min-w-0 rounded-none border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0',
        className,
      )}
      {...props}
    />
  );
}

export function LaunchTextarea({
  className,
  ...props
}: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        'min-h-28 rounded-lg border-0 bg-secondary/70 p-4 text-base leading-relaxed shadow-none focus-visible:ring-2 focus-visible:ring-foreground/15 aria-invalid:ring-2 aria-invalid:ring-destructive/30',
        className,
      )}
      {...props}
    />
  );
}
