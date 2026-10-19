'use client';

import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  allocationLabels,
  numberValue,
  type LaunchDraft,
} from '../../lib/launch-draft';
import { SupplyShare } from './supply-share';
import { AnimatePresence, motion } from 'motion/react';
import {
  launchTransition,
  useLaunchReducedMotion,
} from '../../lib/launch-motion';

export function AllocationPreview({
  draft,
  showVesting = false,
}: {
  draft: LaunchDraft;
  showVesting?: boolean;
}) {
  const reduced = useLaunchReducedMotion();
  const shares = [
    {
      label: allocationLabels[draft.method],
      percent: draft.allocation.saleShare,
      color: 'bg-foreground',
    },
    {
      label: 'Pool',
      percent: draft.allocation.poolShare,
      color: 'bg-lime',
    },
    {
      label: 'Team',
      percent: draft.allocation.teamShare,
      color: 'bg-orange',
    },
  ];
  const months = (value: string) =>
    `${value} ${value === '1' ? 'month' : 'months'}`;
  return (
    <div className="mt-4">
      <CardContent>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-border"
          role="img"
          aria-label={shares
            .map((item) => `${item.label} ${item.percent}%`)
            .join(', ')}
        >
          <AnimatePresence initial={false}>
            {shares.map(
              (item) =>
                Number.isFinite(numberValue(item.percent)) &&
                numberValue(item.percent) > 0 && (
                  <motion.span
                    key={item.label}
                    className={cn('shrink-0', item.color)}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                      width: `${Math.min(numberValue(item.percent), 100)}%`,
                      opacity: 1,
                    }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                      ...launchTransition,
                      width: reduced ? { duration: 0 } : launchTransition,
                    }}
                  />
                ),
            )}
          </AnimatePresence>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {shares.map((item) => (
            <SupplyShare
              key={item.label}
              label={item.label}
              percent={item.percent}
              colorClassName={item.color}
              supply={draft.supply}
              symbol={draft.symbol}
            />
          ))}
        </div>
        {showVesting && numberValue(draft.allocation.teamShare) > 0 && (
          <p className="mt-4 text-small text-muted-foreground">
            Team vesting: {months(draft.allocation.cliffMonths)} cliff ·{' '}
            {months(draft.allocation.vestingMonths)} vesting
          </p>
        )}
      </CardContent>
    </div>
  );
}
