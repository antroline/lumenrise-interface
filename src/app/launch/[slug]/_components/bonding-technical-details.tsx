'use client';

import { useState, type ReactNode } from 'react';
import { Accordion } from '@base-ui/react/accordion';
import { ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import styles from './project-detail.module.css';
import { pairLabel } from '@/lib/api/launches/display';
import type { LaunchResult } from '@/lib/api/launches/market';
import type { ApiNetwork } from '@/lib/api/launches/types';
import type { Snapshot, Tokens } from '../_bonding/contract';
import {
  bondingDetails,
  durationLabel,
  indexedContract,
  detailDate,
  detailAmount,
} from './bonding-details';

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
    <div className="flex min-w-0 flex-col gap-2">
      <span className="break-all font-mono text-small">{value}</span>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void copy()}
          aria-label={`Copy ${value}`}
        >
          <Copy data-icon="inline-start" />
          Copy
        </Button>
        <a
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
          href={`https://stellar.expert/explorer/${network}/${value.startsWith('C') ? 'contract' : 'account'}/${value}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Explorer
          <ExternalLink data-icon="inline-end" />
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

function Group({
  title,
  rows,
}: {
  title: string;
  rows: [string, ReactNode][];
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h3 className="text-[18px] font-semibold">{title}</h3>
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

export function BondingTechnicalDetails({
  address,
  network,
  launch,
  snapshot,
  tokens,
  children,
}: {
  address: string;
  network: ApiNetwork;
  launch?: LaunchResult;
  snapshot?: Snapshot;
  tokens?: Tokens;
  children?: ReactNode;
}) {
  const raw = indexedContract(launch);
  const c = snapshot?.config ?? raw.config;
  const state = snapshot?.state ?? raw.state;
  const b = bondingDetails(launch, snapshot);
  const p = c?.params;
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
  const addr = (value: string | undefined) =>
    value ? <Address value={value} network={network} /> : 'Unavailable';
  const cliff = b
    ? BigInt(b.startsAt) + BigInt(b.vesting.cliffSeconds)
    : undefined;
  return (
    <section className={styles.technical}>
      <Accordion.Root>
        <Accordion.Item value="technical">
          <Accordion.Header render={<h2 />}>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 rounded-md text-left text-[22px] font-semibold tracking-[-0.025em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[25px]">
              Technical details
              <ChevronDown className="size-5 shrink-0 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
            <div className="flex min-w-0 flex-col gap-8 border-t border-divider pt-6 mt-6">
              {!snapshot && raw.error && (
                <p role="status" className="text-small text-muted-foreground">
                  Raw contract configuration unavailable: {raw.error} The
                  validated launch projection is shown where available.
                </p>
              )}
              <Group
                title="Contract addresses"
                rows={[
                  ['Launch contract', addr(address)],
                  ['Launch token contract', addr(p?.asset ?? launch?.asset)],
                  ['Quote token contract', addr(p?.pair ?? launch?.pair)],
                  ['Creator', addr(p?.owner ?? launch?.owner)],
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
                      ['Ends at', detailDate(b.endsAt)],
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
    </section>
  );
}
