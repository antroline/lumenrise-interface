import {
  auctionSupplySplit,
  type LaunchDraft,
} from '../../_launch/launch-draft';

export function AuctionReviewBreakdown({ draft }: { draft: LaunchDraft }) {
  const split = auctionSupplySplit(
    draft.auction.saleShare,
    draft.auction.liquidityShare,
  );
  if (!split) return null;
  return (
    <div className="mt-5" aria-label="Auction token supply breakdown">
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={`${split.sold}% estimated for bidders, ${split.reserve}% estimated for liquidity, ${split.outside}% outside the auction`}
      >
        <span className="bg-foreground" style={{ width: `${split.sold}%` }} />
        <span className="bg-lime" style={{ width: `${split.reserve}%` }} />
        <span className="bg-secondary" style={{ width: `${split.outside}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        <span>{split.sold}% for bidders</span>
        <span>{split.reserve}% estimated for liquidity</span>
        <span>{split.outside}% outside auction</span>
      </div>
    </div>
  );
}
