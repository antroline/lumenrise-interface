'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  allocationLabels,
  numberValue,
  type LaunchDraft,
} from '../../_launch/launch-draft';
import { SupplyShare } from './supply-share';

export function AllocationPreview({ draft }: { draft: LaunchDraft }) {
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
  const total = shares.reduce(
    (sum, item) =>
      sum + (Number.isFinite(numberValue(item.percent))
        ? Math.round(numberValue(item.percent) * 100)
        : 0),
    0,
  );
  return (
    <Card variant="surface" size="sm">
      <CardHeader>
        <CardTitle>Supply allocation</CardTitle>
        <CardDescription>{total / 100}% allocated · must equal 100%</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-border"
          role="img"
          aria-label={shares.map((item) => `${item.label} ${item.percent}%`).join(', ')}
        >
          {shares.map(
            (item) =>
              Number.isFinite(numberValue(item.percent)) &&
              numberValue(item.percent) > 0 && (
                <span
                  key={item.label}
                  className={cn('shrink-0', item.color)}
                  style={{ width: `${Math.min(numberValue(item.percent), 100)}%` }}
                />
              ),
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {shares.map((item) => (
            <SupplyShare
              key={item.label}
              label={item.label}
              percent={item.percent}
              supply={draft.supply}
              symbol={draft.symbol}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
