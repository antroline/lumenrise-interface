'use client';

import { Slider } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

function sliderValue(percent: string) {
  const value = Number.parseFloat(percent);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
}

export function AllocationSlider({
  label,
  value,
  onChange,
  fill,
  descriptionId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Segment color shared with the allocation bar. */
  fill: string;
  descriptionId?: string;
}) {
  return (
    <Slider.Root
      value={sliderValue(value)}
      onValueChange={(next) => onChange(String(next))}
      min={0}
      max={100}
      step={1}
      thumbAlignment="edge"
      className="flex w-full items-center"
    >
      <Slider.Control className="flex w-full touch-none items-center py-2 select-none">
        <Slider.Track className="relative h-1 w-full rounded-full bg-border">
          <Slider.Indicator
            className={cn('absolute inset-y-0 rounded-full', fill)}
          />
          <Slider.Thumb
            aria-label={`${label} percentage`}
            aria-describedby={descriptionId}
            className="size-4 cursor-grab rounded-full border-2 border-foreground bg-background transition-transform duration-150 hover:scale-125 focus-visible:scale-125 focus-visible:ring-3 focus-visible:ring-lime/60 focus-visible:outline-none active:cursor-grabbing data-[dragging]:scale-125 motion-reduce:transition-none"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
