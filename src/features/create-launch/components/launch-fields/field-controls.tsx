import type { ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export { FieldSurface, FormInput as LaunchInput } from '@/components/form-controls';

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
