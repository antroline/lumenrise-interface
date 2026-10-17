'use client';

import { cn } from '@/lib/utils';

export type AllocationPreset = {
  label: string;
  value: string;
  poolShare: string;
  teamShare: string;
};

function presetShare(value: string) {
  const share = Number.parseFloat(value);
  return Number.isFinite(share) ? Math.max(share, 0) : 0;
}

export function AllocationPresets({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly AllocationPreset[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={`${label} quick choices`}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const split = [
          presetShare(option.value),
          presetShare(option.poolShare),
          presetShare(option.teamShare),
        ];
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={`Set ${label.toLowerCase()} to ${option.label}`}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-11 studio-compact:min-h-8 items-center gap-2.5 rounded-full border px-3.5 text-small font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none motion-reduce:transform-none',
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:border-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-1 w-9 overflow-hidden rounded-full transition-colors duration-200',
                selected ? 'bg-background/25' : 'bg-border',
              )}
            >
              {split[0] > 0 && (
                <span
                  className={cn(
                    'transition-colors duration-200',
                    selected ? 'bg-background' : 'bg-foreground',
                  )}
                  style={{ width: `${split[0]}%` }}
                />
              )}
              {split[1] > 0 && (
                <span className="bg-lime" style={{ width: `${split[1]}%` }} />
              )}
              {split[2] > 0 && (
                <span className="bg-orange" style={{ width: `${split[2]}%` }} />
              )}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
