'use client';

import { Gavel, LineChart, Tag, Wallet } from 'lucide-react';
import type { LaunchMethod } from '../_launch/launch-draft';
import { MethodCard } from './method-card';

export function MethodChoice({
  onChoose,
  selected,
}: {
  onChoose: (method: LaunchMethod) => void;
  selected: LaunchMethod | null;
}) {
  return (
    <div id="launch-methods" className="grid gap-3 @lg/launch:grid-cols-2">
      <MethodCard
        icon={Wallet}
        title="Basic"
        detail="Create a fixed-supply Stellar testnet token. No sale is configured."
        illustration="/illustrations/launch-methods/basic.png"
        badge="Live on testnet"
        selected={selected === 'basic'}
        onClick={() => onChoose('basic')}
      />
      <MethodCard
        icon={LineChart}
        title="Bonding curve"
        detail="Let the price respond to purchases, then move to a pool at your raise target."
        illustration="/illustrations/launch-methods/bonding-curve.png"
        badge="Coming soon"
        selected={selected === 'bonding'}
        onClick={() => onChoose('bonding')}
      />
      <MethodCard
        icon={Tag}
        title="Fixed price"
        detail="Offer an allocation at one price during a defined sale window."
        illustration="/illustrations/launch-methods/fixed-price.png"
        badge="Coming soon"
        selected={selected === 'fixed'}
        onClick={() => onChoose('fixed')}
      />
      <MethodCard
        icon={Gavel}
        title="Auction"
        detail="Set a floor price and sale window, then plan post-auction liquidity."
        illustration="/illustrations/launch-methods/auction.png"
        badge="Coming soon"
        selected={selected === 'auction'}
        onClick={() => onChoose('auction')}
      />
    </div>
  );
}
