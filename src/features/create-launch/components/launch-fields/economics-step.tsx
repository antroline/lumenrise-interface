'use client';

import { FieldGroup } from '@/components/ui/field';
import type { LaunchDraft } from '../../lib/launch-draft';
import { NumberField } from './number-field';
import { QuoteChoice } from './quote-choice';
import type { DraftProps } from './types';
import { LaunchFieldError } from '../launch-motion';

export function EconomicsStep({ draft, setDraft, errors = {} }: DraftProps) {
  const updateFixed = (patch: Partial<LaunchDraft['fixed']>) =>
    setDraft((current) => ({
      ...current,
      fixed: { ...current.fixed, ...patch },
    }));
  const updateAuction = (patch: Partial<LaunchDraft['auction']>) =>
    setDraft((current) => ({
      ...current,
      auction: { ...current.auction, ...patch },
    }));
  return (
    <FieldGroup className="gap-4 studio-compact:gap-3">
      <QuoteChoice
        value={draft.quote}
        usdcOnly={draft.method === 'bonding'}
        onChange={(quote) => setDraft((current) => ({ ...current, quote }))}
      />
      <LaunchFieldError className="text-small text-bad">{errors['launch-quote']}</LaunchFieldError>
      {draft.method === 'fixed' && (
        <NumberField
          id="fixed-price"
          label="Price per token"
          unit={draft.quote}
          value={draft.fixed.price}
          onChange={(price) => updateFixed({ price })}
          placeholder="Enter a price"
          groupThousands
          error={errors['fixed-price']}
        />
      )}
      {draft.method === 'auction' && (
        <>
          <NumberField
            id="auction-liquidity"
            label="Proceeds for post-auction liquidity"
            unit="%"
            value={draft.auction.liquidityShare}
            onChange={(liquidityShare) => updateAuction({ liquidityShare })}
            help="Share of the payment asset raised that will seed the liquidity pool. This is separate from the token supply reserved for the pool in Supply & allocation."
            error={errors['auction-liquidity']}
            presets={[
              { label: '25%', value: '25' },
              { label: '50%', value: '50' },
              { label: '75%', value: '75' },
              { label: '100%', value: '100' },
            ]}
          />
          <NumberField
            id="auction-floor"
            label="Floor price per token"
            unit={draft.quote}
            value={draft.auction.floorPrice}
            onChange={(floorPrice) => updateAuction({ floorPrice })}
            help="Lowest bid price; the final price depends on bids."
            placeholder="Enter a floor price"
            groupThousands
            error={errors['auction-floor']}
          />
        </>
      )}
    </FieldGroup>
  );
}
