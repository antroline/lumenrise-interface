'use client';

import { cn } from '@/lib/utils';
import type { Preset } from './types';

export function PresetChoices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Preset[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
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
            'min-h-9 rounded-full border px-3.5 text-small font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none motion-reduce:transform-none',
            value === option.value
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-card text-foreground hover:border-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
