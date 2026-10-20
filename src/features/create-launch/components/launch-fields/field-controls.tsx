import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const launchFieldSurfaceClassName =
  'rounded-lg border border-transparent bg-secondary/60 px-3.5 py-2 transition-[box-shadow,background-color,border-color] hover:bg-secondary focus-within:border-foreground/20 focus-within:bg-card focus-within:ring-3 focus-within:ring-lime/40 has-[[aria-invalid=true]]:border-bad/50 motion-reduce:transition-none';

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
        // `h-control` from the shared input is not merged away, so the compact height needs priority.
        'h-8! min-w-0 rounded-none border-0 bg-transparent px-0 text-[17px] font-semibold shadow-none focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0',
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
