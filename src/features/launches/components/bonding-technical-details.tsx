'use client';

import { useState, type ReactNode } from 'react';
// The "Full contract accounting" panel below is commented out; restore these imports with it.
// import { Accordion } from '@base-ui/react/accordion';
// import { ChevronDown } from 'lucide-react';
// import { pairLabel } from '@/lib/api/launches/display';
// import { detailAmount, detailDate, durationLabel } from '../lib/bonding-details';
import { Copy, ExternalLink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LaunchResult } from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from '../bonding/contract';
import { indexedContract } from '../lib/bonding-details';
import { explorerUrl, explorerName } from '@/lib/chain-address';

function Address({ value, network }: { value: string; network: ApiNetwork }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Address copied.');
    } catch {
      setMessage('Could not copy. Select the address to copy it manually.');
    }
  }
  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex w-full min-w-0 items-center justify-end gap-1">
        <span
          title={value}
          className="min-w-0 truncate text-right font-mono text-xs sm:text-[13.5px]"
        >
          {value.slice(0, 8)}…{value.slice(-8)}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => void copy()}
          aria-label={`Copy ${value}`}
        >
          <Copy />
        </Button>
        <a
          className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}
          href={explorerUrl(value, network)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${value} on ${explorerName()}`}
        >
          <ExternalLink />
        </a>
      </div>
      {message && (
        <span role="status" className="text-small text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}

/* Used only by the commented-out "Full contract accounting" panel.
function Group({
  title,
  rows,
}: {
  title: string;
  rows: [string, ReactNode][];
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h4 className="text-[15px] font-semibold">{title}</h4>
      <dl className="flex min-w-0 flex-col gap-4 text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-5"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words tabular-nums">
              {value ?? 'Unavailable'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
*/

export function BondingTechnicalDetails({
  address,
  network,
  launch,
  snapshot,
  loading = false,
}: {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  loading?: boolean;
  /** Rendered inside the full contract accounting panel, which is currently commented out. */
  children?: ReactNode;
}) {
  const raw = indexedContract(launch);
  const c = snapshot?.config ?? raw.config;
  const p = c?.params;
  const addr = (value: string | undefined) =>
    value ? (
      <Address value={value} network={network} />
    ) : loading ? (
      <Skeleton className="ml-auto h-4 w-40 motion-reduce:animate-none" />
    ) : (
      'Unavailable'
    );
  /* Used only by the commented-out "Full contract accounting" panel.
  const state = snapshot?.state ?? raw.state;
  const pair = tokens
    ? tokens.pair.isNative()
      ? 'XLM'
      : tokens.pairSymbol
    : pairLabel(p?.pair ?? launch?.pair, network) === 'XLM'
      ? 'XLM'
      : 'quote tokens';
  const ticker = p?.metadata.symbol ?? launch?.metadata.symbol ?? 'tokens';
  const tokenAmount = (value: string | undefined) =>
    value === undefined ? 'Unavailable' : `${detailAmount(value)} ${ticker}`;
  const pairAmount = (value: string | undefined) =>
    value === undefined ? 'Unavailable' : `${detailAmount(value)} ${pair}`;
  const cliff = b
    ? BigInt(b.startsAt) + BigInt(b.vesting.cliffSeconds)
    : undefined;
  */
  return (
    <div className="min-w-0">
      <dl className="flex flex-col text-[14px]">
        {(
          [
            ['Launch contract', addr(address)],
            ['Token contract', addr(p?.asset ?? launch?.asset)],
          ] satisfies [string, ReactNode][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-t border-divider py-3.5 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6"
          >
            <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="min-w-0 break-words text-right leading-relaxed">{value}</dd>
          </div>
        ))}
      </dl>
      {/* Full contract accounting is hidden on the launch page for now.
      <Accordion.Root className="mt-4 border-t border-border pt-5">
        <Accordion.Item value="technical">
          <Accordion.Header render={<h3 />}>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 rounded-md text-left text-[16px] font-semibold tracking-[-0.015em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Full contract accounting
              <ChevronDown className="size-5 shrink-0 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
            <div className="mt-6 flex min-w-0 flex-col gap-8">
              {!snapshot && raw.error && (
                <p role="status" className="text-small text-muted-foreground">
                  Raw contract configuration unavailable: {raw.error} The
                  validated launch projection is shown where available.
                </p>
              )}
              <Group
                title="Administrative addresses"
                rows={[
                  ['Factory', addr(c?.factory ?? launch?.factoryContractId)],
                  ['Platform', addr(c?.platform)],
                ]}
              />
              {b && (
                <>
                  <Group
                    title="Launch configuration"
                    rows={[
                      ['Contract status', b.status],
                      ['Indexed contract version', launch?.bonding?.version],
                      ['Starts at', detailDate(b.startsAt)],
                      ['Ends at', b.endsAt === null ? 'No expiry' : detailDate(b.endsAt)],
                      ['Created', launch?.createdAt ? new Date(launch.createdAt).toUTCString() : 'Unknown'],
                      ['Creation ledger', launch?.creationLedger],
                      ['Creation transaction', launch?.creationTransactionHash],
                      ['Total supply', tokenAmount(b.totalSupply)],
                      [
                        'Curve allocation',
                        `${tokenAmount(b.buckets.curve)} · ${b.allocations.curveBps / 100}% configured`,
                      ],
                      [
                        'Pool allocation',
                        `${tokenAmount(b.buckets.pool)} · ${b.allocations.poolBps / 100}% configured`,
                      ],
                      [
                        'Team allocation',
                        `${tokenAmount(b.buckets.team)} · ${b.allocations.teamBps / 100}% configured`,
                      ],
                      ['Token identity', tokens?.assetName],
                      ['Quote token identity', tokens?.pairName],
                      ['Token decimals', tokens?.assetDecimals.toString()],
                      ['Quote token decimals', tokens?.pairDecimals.toString()],
                      ['Logo URL', p?.metadata.logo ?? launch?.metadata.logo],
                      [
                        'Distinct buyers recorded',
                        b.state.buyerCount.toLocaleString('en-US'),
                      ],
                      [
                        'Contract busy',
                        state ? (state.busy ? 'Yes' : 'No') : undefined,
                      ],
                      [
                        'Snapshot ledger',
                        snapshot
                          ? 'Live RPC snapshot'
                          : launch?.stateAsOfLedger,
                      ],
                      ['Indexed observation', launch?.stateObservedAt],
                    ]}
                  />
                  <Group
                    title="Curve parameters"
                    rows={[
                      [
                        'Initial virtual token reserve',
                        tokenAmount(b.curve.virtualBaseReserve),
                      ],
                      [
                        'Initial virtual quote reserve',
                        pairAmount(b.curve.virtualQuoteReserve),
                      ],
                      [
                        'Creator trading fee',
                        `${b.curve.creatorFeeBps / 100}% (${b.curve.creatorFeeBps} bps)`,
                      ],
                      [
                        'Current marginal price before fee',
                        snapshot
                          ? pairAmount(snapshot.price.toString())
                          : undefined,
                      ],
                      ['Net tokens sold', tokenAmount(b.state.sold)],
                      [
                        'Remaining curve inventory',
                        tokenAmount(
                          (
                            BigInt(b.buckets.curve) - BigInt(b.state.sold)
                          ).toString(),
                        ),
                      ],
                      [
                        'Actual vault token balance',
                        tokens
                          ? tokenAmount(tokens.vaultAssetBalance.toString())
                          : undefined,
                      ],
                      [
                        'Actual vault quote balance',
                        tokens
                          ? pairAmount(tokens.vaultPairBalance.toString())
                          : undefined,
                      ],
                    ]}
                  />
                  <Group
                    title="Graduation accounting"
                    rows={[
                      ['Graduated', b.state.graduated ? 'Yes' : 'No'],
                      ['Net quote reserves', pairAmount(b.state.quoteReserve)],
                      [
                        'Graduation target',
                        pairAmount(b.curve.graduationTarget),
                      ],
                      [
                        'Target reached',
                        BigInt(b.state.quoteReserve) >=
                        BigInt(b.curve.graduationTarget)
                          ? 'Yes'
                          : 'No',
                      ],
                      [
                        'Creator payout share',
                        `${b.curve.creatorPayoutBps / 100}%`,
                      ],
                      [
                        'Platform fee share',
                        `${b.curve.platformFeeBps / 100}%`,
                      ],
                      [
                        'Unclaimed creator fees',
                        pairAmount(b.state.creatorFees),
                      ],
                      [
                        'Creator payout preview',
                        snapshot
                          ? pairAmount(
                              snapshot.preview.creator_payout.toString(),
                            )
                          : undefined,
                      ],
                      [
                        'Platform fee preview',
                        snapshot
                          ? pairAmount(snapshot.preview.platform_fee.toString())
                          : undefined,
                      ],
                      [
                        'Quote tokens earmarked for pool',
                        snapshot
                          ? pairAmount(
                              snapshot.preview.pool_pair_amount.toString(),
                            )
                          : undefined,
                      ],
                      [
                        'Launch tokens earmarked for pool',
                        snapshot
                          ? tokenAmount(
                              snapshot.preview.pool_asset_amount.toString(),
                            )
                          : undefined,
                      ],
                      [
                        'Unsold curve tokens preview',
                        snapshot
                          ? tokenAmount(
                              snapshot.preview.unsold_curve_amount.toString(),
                            )
                          : undefined,
                      ],
                    ]}
                  />
                  <p className="text-small text-muted-foreground">
                    The accounting preview uses current reserves. It does not
                    represent a completed pool creation or proceeds transfer.
                  </p>
                  <Group
                    title="Vesting configuration"
                    rows={[
                      ['Cliff duration', durationLabel(b.vesting.cliffSeconds)],
                      [
                        'Duration after cliff',
                        durationLabel(b.vesting.durationSeconds),
                      ],
                      ['Unlock schedule', b.vesting.schedule],
                      ['Cliff ends', detailDate(cliff?.toString())],
                      [
                        'Fully vested at',
                        BigInt(b.vesting.durationSeconds) === BigInt(0)
                          ? 'Immediately — no vesting delay'
                          : detailDate(
                              (
                                BigInt(cliff ?? 0) +
                                BigInt(b.vesting.durationSeconds)
                              ).toString(),
                            ),
                      ],
                      [
                        'Team tokens already claimed',
                        tokenAmount(b.state.teamClaimed),
                      ],
                      [
                        'Team tokens claimable now',
                        snapshot
                          ? tokenAmount(snapshot.claimableTeam.toString())
                          : undefined,
                      ],
                      [
                        'Team tokens remaining',
                        tokenAmount(
                          (
                            BigInt(b.buckets.team) - BigInt(b.state.teamClaimed)
                          ).toString(),
                        ),
                      ],
                    ]}
                  />
                  <p className="text-small text-muted-foreground">
                    A zero vesting duration makes the team allocation
                    immediately claimable. Otherwise, vesting uses the launch
                    start, cliff and stepped unlocks. Monthly periods are fixed
                    at 30 days. The creator claims team tokens and trading fees
                    through the contract.
                  </p>
                </>
              )}
              {children}
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
      */}
    </div>
  );
}
