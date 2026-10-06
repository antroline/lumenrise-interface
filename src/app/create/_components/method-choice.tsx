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
    <div id="launch-methods" className="grid gap-4 sm:grid-cols-2">
      <MethodCard
        icon={Wallet}
        title="Basic"
        detail="Create a fixed-supply Stellar testnet token. No sale is configured."
        badge="Live on testnet"
        selected={selected === 'basic'}
        onClick={() => onChoose('basic')}
      />
      <MethodCard
        icon={LineChart}
        title="Bonding curve"
        detail="Let the price respond to purchases, then move to a pool at your raise target."
        badge="Coming soon"
        selected={selected === 'bonding'}
        onClick={() => onChoose('bonding')}
      />
      <MethodCard
        icon={Tag}
        title="Fixed price"
        detail="Offer an allocation at one price during a defined sale window."
        badge="Coming soon"
        selected={selected === 'fixed'}
        onClick={() => onChoose('fixed')}
      />
      <MethodCard
        icon={Gavel}
        title="Auction"
        detail="Set a floor price and sale window, then plan post-auction liquidity."
        badge="Coming soon"
        selected={selected === 'auction'}
        onClick={() => onChoose('auction')}
      />
    </div>
  );
}
