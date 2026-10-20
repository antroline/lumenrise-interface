import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { methodLabels, type LaunchMethod } from '../lib/launch-draft';
import { LaunchMethodIcon } from './launch-method-icon';

export function MethodCard({
  method,
  detail,
  selected,
  onChoose,
}: {
  method: LaunchMethod;
  detail: string;
  selected: boolean;
  onChoose?: () => void;
}) {
  const disabled = method !== 'bonding';
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onChoose}
      className={cn(
        'flex min-h-16 studio-compact:min-h-14 studio-compact:gap-2 studio-compact:p-2 min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground motion-reduce:transition-none',
        disabled
          ? 'cursor-not-allowed border-border text-muted-foreground/60'
          : 'cursor-pointer text-foreground hover:border-foreground',
        selected
          ? 'border-border bg-primary/10 shadow-[inset_0_0_0_1px_var(--color-lime)] hover:border-lime'
          : !disabled && 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'grid size-10 studio-compact:size-9 shrink-0 place-items-center rounded-lg border bg-card',
          selected ? 'border-lime bg-limetext-ink' : 'border-border',
        )}
      >
        <LaunchMethodIcon
          method={method}
          className="size-8 studio-compact:size-7"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <strong className="text-sm font-medium leading-snug">
          {methodLabels[method]}
        </strong>
        <span
          className={cn(
            'text-xs leading-snug',
            disabled && 'studio-compact:hidden',
          )}
        >
          {detail}
        </span>
        {disabled && <span className="text-xs">Coming soon</span>}
      </span>
      {selected && (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-ink">
          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only">Selected</span>
        </span>
      )}
    </button>
  );
}
