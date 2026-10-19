'use client';

import { cn } from '@/lib/utils';
import type { Preset } from './types';

export function PresetChoices({
  label,
  value,
  options,
  onChange,
  className,
  variant = 'default',
}: {
  label: string;
  value: string;
  options: readonly Preset[];
  onChange: (value: string) => void;
  className?: string;
  variant?: 'default' | 'inline';
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap',
        variant === 'inline' ? 'gap-1' : 'gap-2',
        className,
      )}
      role="group"
      aria-label={`${label} quick choices`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={`Set ${label.toLowerCase()} to ${option.label}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-11 studio-compact:min-h-8 border text-small font-semibold tabular-nums transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none motion-reduce:transition-none',
            variant === 'inline' ? 'rounded-xl px-2.5' : 'rounded-full px-3.5',
            value === option.value
              ? 'border-foreground bg-foreground text-background'
              : variant === 'inline'
                ? 'border-transparent bg-transparent text-muted-foreground hover:bg-card hover:text-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
