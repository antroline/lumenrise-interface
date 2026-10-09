'use client';

import { FieldGroup } from '@/components/ui/field';
import type { LaunchDraft } from '../../_launch/launch-draft';
import { NumberField } from './number-field';
import { QuoteChoice } from './quote-choice';
import type { DraftProps } from './types';

export function EconomicsStep({ draft, setDraft, errors = {} }: DraftProps) {
  const updateBonding = (patch: Partial<LaunchDraft['bonding']>) =>
    setDraft((current) => ({
      ...current,
      bonding: { ...current.bonding, ...patch },
    }));
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
    <FieldGroup>
      <QuoteChoice
        value={draft.quote}
        onChange={(quote) => setDraft((current) => ({ ...current, quote }))}
      />
      {draft.method === 'bonding' && (
        <NumberField
          id="curve-target"
          label="Graduation target"
          unit={draft.quote}
          value={draft.bonding.target}
          onChange={(target) => updateBonding({ target })}
          help="When the curve raises this amount, trading moves to a liquidity pool. A higher target keeps the curve active longer."
          placeholder="Enter a target"
          groupThousands
          error={errors['curve-target']}
          presets={
            draft.quote === 'XLM'
              ? [
                  { label: '100 XLM', value: '100' },
                  { label: '500 XLM', value: '500' },
                  { label: '1,000 XLM', value: '1000' },
                ]
              : [
                  { label: '1,000 USDC', value: '1000' },
                  { label: '5,000 USDC', value: '5000' },
                  { label: '10,000 USDC', value: '10000' },
                ]
          }
        />
      )}
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
