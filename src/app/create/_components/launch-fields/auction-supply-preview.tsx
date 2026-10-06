'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  auctionSupplySplit,
  type LaunchDraft,
} from '../../_launch/launch-draft';
import { SupplyShare } from './supply-share';

export function AuctionSupplyPreview({ draft }: { draft: LaunchDraft }) {
  const split = auctionSupplySplit(
    draft.auction.saleShare,
    draft.auction.liquidityShare,
  );
  return (
    <Card variant="surface" size="sm">
      <CardHeader>
        <CardTitle>Token supply breakdown</CardTitle>
        <CardDescription>
          Estimated pool reserve; final amounts depend on the launch contract.
        </CardDescription>
      </CardHeader>
      {split ? (
        <CardContent>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-border"
            role="img"
            aria-label={`${split.sold}% estimated for bidders, ${split.reserve}% estimated for liquidity, ${split.outside}% outside the auction`}
          >
            <span
              className="bg-foreground"
              style={{ width: `${split.sold}%` }}
            />
            <span className="bg-lime" style={{ width: `${split.reserve}%` }} />
            <span
              className="bg-border"
              style={{ width: `${split.outside}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SupplyShare
              label="Estimated for bidders"
              percent={split.sold}
              supply={draft.supply}
              symbol={draft.symbol}
            />
            <SupplyShare
              label="Estimated pool reserve"
              percent={split.reserve}
              supply={draft.supply}
              symbol={draft.symbol}
            />
            <SupplyShare
              label="Outside this auction"
              percent={split.outside}
              supply={draft.supply}
              symbol={draft.symbol}
            />
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-small text-muted-foreground">
            Enter valid percentages to see the breakdown.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
