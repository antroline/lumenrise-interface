'use client';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { launchTransition, useLaunchReducedMotion } from '../../lib/launch-motion';

export type AllocationBarShare = {
  id: string;
  label: string;
  percent: string;
  /** Segment fill. */
  segment: string;
  /** Text color for the label drawn on the segment. */
  onSegment: string;
};

/** Segments under this width stay unlabeled; the rows below carry exact values. */
const SEGMENT_LABEL_MIN_PERCENT = 9;

function shareValue(percent: string) {
  const value = Number.parseFloat(percent);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function AllocationBar({
  shares,
  invalid,
}: {
  shares: readonly AllocationBarShare[];
  invalid: boolean;
}) {
  const reduced = useLaunchReducedMotion();
  const values = shares.map((share) => shareValue(share.percent));
  const total = values.reduce((sum, value) => sum + value, 0);
  // Oversubscribed splits stay inside the bar so the whole distribution
  // remains readable; the validation state names the problem.
  const scale = total > 100 ? 100 / total : 1;

  return (
    <div
      role="img"
      aria-label={`${shares
        .map((share, index) => `${share.label} ${values[index]}%`)
        .join(', ')}. Total ${Math.round(total * 100) / 100}% of 100%.`}
      className={cn(
        'flex h-10 overflow-hidden rounded-full border transition-[background-color,border-color] duration-200 short:h-9',
        invalid ? 'border-bad-line bg-bad-soft' : 'border-border bg-muted',
      )}
    >
      <AnimatePresence initial={false}>
        {shares.map(
          (share, index) =>
            values[index] > 0 && (
              <motion.span
                key={share.id}
                className={cn(
                  'flex h-full min-w-0 shrink-0 items-center justify-center',
                  share.segment,
                )}
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: `${values[index] * scale}%`,
                  opacity: 1,
                }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                  ...launchTransition,
                  width: reduced ? { duration: 0 } : launchTransition,
                }}
              >
                {values[index] * scale >= SEGMENT_LABEL_MIN_PERCENT && (
                  <span
                    className={cn(
                      'text-small font-semibold tabular-nums',
                      share.onSegment,
                    )}
                  >
                    {values[index]}%
                  </span>
                )}
              </motion.span>
            ),
        )}
      </AnimatePresence>
    </div>
  );
}
