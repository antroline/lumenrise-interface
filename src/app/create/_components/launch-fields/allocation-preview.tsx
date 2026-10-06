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
  formatSupplyShare,
  numberValue,
  type LaunchDraft,
} from '../../_launch/launch-draft';

export function AllocationPreview({ draft }: { draft: LaunchDraft }) {
  if (draft.method !== 'bonding') return null;
  const shares = [
    {
      label: 'Curve',
      value: numberValue(draft.bonding.curveShare),
      color: 'bg-foreground',
    },
    {
      label: 'Pool',
      value: numberValue(draft.bonding.poolShare),
      color: 'bg-lime',
    },
    {
      label: 'Team',
      value: numberValue(draft.bonding.teamShare),
      color: 'bg-orange',
    },
  ];
  const total = shares.reduce(
    (sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0),
    0,
  );
  return (
    <Card variant="surface" size="sm">
      <CardHeader>
        <CardTitle>Supply allocation</CardTitle>
        <CardDescription>{total}% allocated · must equal 100%</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-border"
          role="img"
          aria-label={`Curve ${draft.bonding.curveShare}%, pool ${draft.bonding.poolShare}%, team ${draft.bonding.teamShare}%`}
        >
          {shares.map(
            (item) =>
              Number.isFinite(item.value) &&
              item.value > 0 && (
                <span
                  key={item.label}
                  className={cn(item.color)}
                  style={{ width: `${Math.min(item.value, 100)}%` }}
                />
              ),
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {shares.map((item) => (
            <div key={item.label}>
              <p className="text-small text-muted-foreground">
                {item.label} · {Number.isFinite(item.value) ? item.value : '—'}%
              </p>
              <p className="mt-1 text-ui font-semibold tabular-nums">
                {formatSupplyShare(
                  draft.supply,
                  item.label === 'Curve'
                    ? draft.bonding.curveShare
                    : item.label === 'Pool'
                      ? draft.bonding.poolShare
                      : draft.bonding.teamShare,
                )}{' '}
                {draft.symbol || 'tokens'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
