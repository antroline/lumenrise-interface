import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const fieldSurfaceClassName =
  'rounded-lg border border-transparent bg-secondary/60 px-3.5 py-2 transition-[background-color,border-color] hover:bg-secondary focus-within:border-foreground/20 focus-visible:ring-0 has-[[aria-invalid=true]]:border-bad/50 motion-reduce:transition-none';

export function FieldSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn(fieldSurfaceClassName, className)} {...props} />
  );
}

export function FormInput({
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

