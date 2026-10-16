'use client';

import { EngravePattern } from '@/features/launches/components/engraving';
import { useRevealed } from '@/features/launches/hooks/use-revealed';
import { useSvgId } from '@/features/launches/hooks/use-svg-id';
import {
  curveShape,
  type CurveModelInput,
} from '@/features/launches/lib/curve-model';
import { cn } from '@/lib/utils';

const WIDTH = 320;
// Matches the rendered height (h-16) so the engraved hairlines stay on whole pixels.
const HEIGHT = 64;

/** The launch-page curve at card scale: raised area in a lime fade, the run to the target engraved, graduation in orange. */
export function MiniCurve({
  input,
  failed,
  className,
}: {
  input: CurveModelInput;
  failed: boolean;
  className?: string;
}) {
  const id = useSvgId();
  const revealed = useRevealed();
  const shape = curveShape(input, 64);
  if (!shape)
    return (
      <div className={cn('grid h-16 place-items-center rounded-lg bg-secondary text-[12px] text-muted-foreground', className)}>
        Curve unavailable
      </div>
    );

  const y = (value: number) => HEIGHT - value * HEIGHT;
  const line = shape.points
    .map((point, index) => `${index ? 'L' : 'M'}${(point.x * WIDTH).toFixed(1)} ${y(point.y).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  const { sold, graduation } = shape;
  const toTarget = graduation !== null && graduation > sold ? graduation : sold;

  return (
    <div className={cn('relative h-16', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible text-foreground"
      >
        <defs>
          <EngravePattern id={`${id}-lines`} />
          {/* Builds toward the current point, like the board's lanes, so near-flat curves don't read as a solid block. */}
          <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" x2={sold * WIDTH} y1="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0.08 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-lime)', stopOpacity: 1 }} />
          </linearGradient>
          <clipPath id={`${id}-sold`}>
            <rect width={sold * WIDTH} height={HEIGHT} />
          </clipPath>
          <clipPath id={`${id}-target`}>
            <rect x={sold * WIDTH} width={(toTarget - sold) * WIDTH} height={HEIGHT} />
          </clipPath>
          <clipPath id={`${id}-beyond`}>
            <rect x={toTarget * WIDTH} width={(1 - toTarget) * WIDTH} height={HEIGHT} />
          </clipPath>
        </defs>
        <path d={area} clipPath={`url(#${id}-beyond)`} fill={`url(#${id}-lines)`} className="opacity-[0.06]" />
        <path d={area} clipPath={`url(#${id}-target)`} fill={`url(#${id}-lines)`} className="opacity-[0.16]" />
        <g
          className="transition-[clip-path] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
        >
          <path
            d={area}
            clipPath={`url(#${id}-sold)`}
            fill={failed ? undefined : `url(#${id}-fade)`}
            className={failed ? 'fill-foreground/15' : undefined}
          />
        </g>
        <path d={line} fill="none" stroke="currentColor" strokeOpacity={0.85} strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {graduation !== null && (
          <line
            x1={graduation * WIDTH}
            x2={graduation * WIDTH}
            y1={0}
            y2={HEIGHT}
            strokeWidth={1.25}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-chart-5"
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className={cn(
          'absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-foreground transition-opacity delay-700 duration-300 motion-reduce:transition-none',
          failed ? 'bg-card' : 'bg-lime',
          revealed ? 'opacity-100' : 'opacity-0',
        )}
        style={{ left: `${(sold * 100).toFixed(3)}%`, bottom: `${(shape.soldHeight * 100).toFixed(3)}%` }}
      />
    </div>
  );
}
