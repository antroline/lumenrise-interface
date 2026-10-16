import { cn } from '@/lib/utils';
import { useSvgId } from '../hooks/use-svg-id';

/** The brand's engraved texture: horizontal 1px hairlines on a fixed pitch, as on the LumenRise landing site. */
const ENGRAVE_PITCH = 6;

/**
 * Hairline pattern for use inside an SVG `<defs>`. Lines take `currentColor` from where the pattern is
 * defined, not where it is used, so set the colour through `className` here.
 */
export function EngravePattern({ id, pitch = ENGRAVE_PITCH, className }: { id: string; pitch?: number; className?: string }) {
  return (
    <pattern id={id} width="8" height={pitch} patternUnits="userSpaceOnUse" className={className}>
      <rect x="0" y={pitch / 2 - 0.5} width="8" height="1" fill="currentColor" shapeRendering="crispEdges" />
    </pattern>
  );
}

/** A full-bleed engraved field; colour and strength come from the text colour and opacity classes. */
export function EngravedField({ className }: { className?: string }) {
  const id = useSvgId();
  return (
    <svg aria-hidden="true" className={cn('pointer-events-none absolute inset-0 size-full', className)}>
      <defs>
        <EngravePattern id={id} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
