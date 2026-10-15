'use client';

import { useState } from 'react';
import { toneFor } from '../data/allocation-tones';

export type AllocationSlice = {
  key: string;
  name: string;
  share: number;
  toneIndex?: number;
};

/** The allocation list remains the accessible record; this geometry is a visual legend. */
export function AllocationChart({
  slices,
  forSale,
  allocationLabel = 'for sale',
}: {
  slices: AllocationSlice[];
  forSale: string;
  allocationLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const radius = 78,
    circumference = 2 * Math.PI * radius;
  const segments = slices.map((slice, index) => {
    const length = (circumference * slice.share) / 100;
    const offset =
      (circumference *
        slices
          .slice(0, index)
          .reduce((sum, previous) => sum + previous.share, 0)) /
      100;
    return { ...slice, index, length, offset };
  });
  const active = hovered === null ? null : slices[hovered];
  return (
    <svg
      viewBox="0 0 240 240"
      className="mx-auto block w-full"
      aria-hidden="true"
      onPointerLeave={() => setHovered(null)}
    >
      <circle
        cx="120"
        cy="120"
        r="100"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {Array.from({ length: 20 }, (_, index) => {
        const angle = (index * Math.PI) / 10 - Math.PI / 2;
        return (
          <line
            key={index}
            x1={120 + Math.cos(angle) * 98}
            y1={120 + Math.sin(angle) * 98}
            x2={120 + Math.cos(angle) * (index % 5 === 0 ? 105 : 102)}
            y2={120 + Math.sin(angle) * (index % 5 === 0 ? 105 : 102)}
            stroke="var(--muted-foreground)"
            strokeWidth="1"
          />
        );
      })}
      <circle
        cx="120"
        cy="120"
        r="57"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {segments.map((segment) => (
        <circle
          key={segment.key}
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke={toneFor(segment.toneIndex ?? segment.index).color}
          strokeWidth={hovered === segment.index ? 27 : 23}
          strokeDasharray={`${Math.max(0, segment.length - Math.min(3, segment.length / 10))} ${circumference}`}
          strokeDashoffset={-segment.offset}
          transform="rotate(-90 120 120)"
          onPointerEnter={() => setHovered(segment.index)}
        >
          <title>
            {segment.name}: {segment.share}%
          </title>
        </circle>
      ))}
      <text
        x="120"
        y="115"
        textAnchor="middle"
        className="fill-foreground text-[34px] font-semibold tracking-[-0.03em] tabular-nums"
      >
        {active ? `${active.share}%` : forSale}
      </text>
      <text
        x="120"
        y="140"
        textAnchor="middle"
        className="fill-muted-foreground text-[12px]"
      >
        {active?.name ?? allocationLabel}
      </text>
    </svg>
  );
}
