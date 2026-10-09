'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAccount, useBlux, useReadContracts } from '@bluxcc/react';
import { StrKey } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { useLaunchpad } from '@/lib/launchpad';
import { NETWORK } from '@/app/create/_launch/transactions';
import {
  decodeSnapshot, decodeTokens, errorMessage, formatAmount, integer, trusts,
  type Snapshot, type Tokens,
} from './contract';
import { TradeForm } from './trade-form';
import Link from 'next/link';
import { BondingTradeLayout } from '@/app/trade/[slug]/_components/bonding-trade-layout';

function decodeRead<T>(values: readonly unknown[] | undefined, decode: (values: readonly unknown[]) => T) {
  try { return { value: values ? decode(values) : undefined, error: undefined }; }
  catch (cause) { return { value: undefined, error: errorMessage(cause) }; }
}

export function BondingCurvePage({ address, surface = 'launch' }: { address: string; surface?: 'launch' | 'trade' }) {
  const { user, isReady } = useBlux();
  const { login, loginPending } = useLaunchpad();
  const [locked, setLocked] = useState(false);
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(timer);
  }, []);

  const reads = useReadContracts(
    ['get_config', 'get_state', 'status', 'current_price', 'buyer_count', 'claimable_team', 'graduation_preview']
      .map(fn => ({ address, fn, args: [] })),
    { network: NETWORK },
    { enabled: isReady, refetchInterval: 15_000, retry: false },
  );
  const decoded = decodeRead(reads.data?.values, decodeSnapshot);
  const snapshot = decoded.value;
  const params = snapshot?.config.params;
  const tokensRead = useReadContracts([
    ...['name', 'symbol', 'decimals'].map(fn => ({ address: params?.asset ?? '', fn, args: [] })),
    ...['name', 'symbol', 'decimals'].map(fn => ({ address: params?.pair ?? '', fn, args: [] })),
    { address: params?.asset ?? '', fn: 'balance', args: [address] },
    { address: params?.pair ?? '', fn: 'balance', args: [address] },
  ], { network: NETWORK }, { enabled: isReady && !!params, refetchInterval: 15_000, retry: false });
  const decodedTokens = decodeRead(tokensRead.data?.values, values => {
    if (!snapshot) throw new Error('Launch configuration is unavailable.');
    const tokens = decodeTokens(values, snapshot.config, NETWORK);
    if (tokens.assetDecimals !== BigInt(7) || tokens.pairDecimals !== BigInt(7))
      throw new Error('This page requires the contract’s 7-decimal Stellar assets.');
    return tokens;
  });
  const tokens = decodedTokens.value;
  const owner = user?.address;
  const validWallet = !!owner && StrKey.isValidEd25519PublicKey(owner);
  const walletRead = useReadContracts([
    { address: params?.asset ?? '', fn: 'balance', args: [owner ?? ''] },
    { address: params?.pair ?? '', fn: 'balance', args: [owner ?? ''] },
    { address, fn: 'sellable_balance', args: [owner ?? ''] },
  ], { network: NETWORK }, { enabled: isReady && !!params && validWallet, refetchInterval: 15_000, retry: false });
  const wallet = decodeRead(walletRead.data?.values, values => ({
    held: integer(values[0]), pairHeld: integer(values[1]), position: integer(values[2]),
  }));
  const account = useAccount({ address: owner, network: NETWORK }, { enabled: isReady && validWallet, refetchInterval: 15_000, retry: false });

  async function refresh() {
    await Promise.allSettled([
      reads.refetch(),
      ...(params ? [tokensRead.refetch()] : []),
      ...(validWallet && params ? [walletRead.refetch(), account.refetch()] : []),
    ]);
  }

  const coreError = decoded.error || (reads.error && errorMessage(reads.error));
  const walletSection = (<section className="flex flex-col gap-3" aria-labelledby="wallet-heading">
        <h2 id="wallet-heading" className="text-xl font-semibold">Your wallet</h2>
        {!user ? <>
          <p className="text-sm text-muted-foreground">Connect to see your balances and curve position, or to buy and sell.</p>
          <Button className="self-start" disabled={loginPending || !isReady} onClick={() => void login(`/${surface}/${address}`)}>
            {loginPending ? 'Connecting…' : 'Connect wallet'}
          </Button>
        </> : <>
          <p className="break-all font-mono text-sm">{owner}</p>
          {!validWallet && <p role="alert">A Stellar account address is required to trade.</p>}
          {wallet.value && <Facts rows={[
            ['Token balance', `${formatAmount(wallet.value.held)} ${tokens?.assetSymbol ?? params?.metadata.symbol}`],
            ['Pair balance', `${formatAmount(wallet.value.pairHeld)} ${tokens?.pair.isNative() ? 'XLM' : tokens?.pairSymbol ?? 'pair tokens'}`],
            ['Current curve position', wallet.value.position > BigInt(0) ? 'Yes — net curve purchases remain' : 'No net curve position'],
            ['Sellable balance recorded by curve', `${formatAmount(wallet.value.position)} ${params?.metadata.symbol}`],
            ['Held and eligible for sell-back', `${formatAmount(wallet.value.held < wallet.value.position ? wallet.value.held : wallet.value.position)} ${params?.metadata.symbol}`],
            ['Connected as creator', owner === params?.owner ? 'Yes' : 'No'],
          ]} />}
          <p className="text-sm text-muted-foreground">The contract exposes net purchases, not individual purchase history. A zero position can mean no purchases or a full sell-back. Transfers into your wallet do not increase your sellable curve balance.</p>
          {account.data && tokens && <Facts rows={[
            ['Launch token trusted', trusts(account.data, tokens.asset) ? 'Yes' : 'No — added automatically before trading'],
            ['Pair token trusted', trusts(account.data, tokens.pair) ? (tokens.pair.isNative() ? 'Native XLM — no trustline required' : 'Yes') : 'No — needed to hold the pair token'],
          ]} />}
          {account.data === null && <p role="alert">This wallet is not funded on Testnet. Fund it with XLM before trading.</p>}
          {validWallet && !wallet.value && !walletRead.error && !wallet.error && <p role="status">Loading wallet balances…</p>}
          {(walletRead.error || wallet.error || account.error) && <p role="alert" className="break-words text-sm text-destructive">Wallet data unavailable: {wallet.error || errorMessage(walletRead.error || account.error)}</p>}
        </>}
      </section>);
  const buyForm = snapshot && tokens ? <TradeForm key={`buy:${owner ?? 'disconnected'}`} address={address} snapshot={snapshot} tokens={tokens} side="buy" locked={locked} setLocked={setLocked} refresh={refresh} /> : null;
  const sellForm = snapshot && tokens ? <TradeForm key={`sell:${owner ?? 'disconnected'}`} address={address} snapshot={snapshot} tokens={tokens} side="sell" locked={locked} setLocked={setLocked} refresh={refresh} /> : null;
  const rawResponses = (<details className="min-w-0 border-t border-border pt-5">
        <summary className="cursor-pointer font-semibold">Raw contract responses</summary>
        <pre className="mt-3 max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-xs">{JSON.stringify({
          get_config: reads.data?.values[0], get_state: reads.data?.values[1], status: reads.data?.values[2],
          current_price: reads.data?.values[3], buyer_count: reads.data?.values[4],
          claimable_team: reads.data?.values[5], graduation_preview: reads.data?.values[6],
        }, (_, value: unknown) => typeof value === 'bigint' ? value.toString() : value, 2)}</pre>
      </details>);
  const feedback = <>
    {!isReady || (!snapshot && !coreError) ? <p role="status">Loading contract data…</p> : null}
    {coreError && <p role="alert" className="break-words text-sm text-destructive">Could not read this bonding curve: {coreError}. Check the address and retry.</p>}
    {(tokensRead.error || decodedTokens.error) && <p role="alert" className="break-words text-sm text-destructive">Token data unavailable: {decodedTokens.error || errorMessage(tokensRead.error)}. Trading is unavailable until the token identities can be verified.</p>}
  </>;
  if (surface === 'trade') return <BondingTradeLayout
    address={address} snapshot={snapshot} tokens={tokens}
    loading={!isReady || (!snapshot && !coreError) || (!!snapshot && !tokens && !tokensRead.error && !decodedTokens.error)}
    refreshAction={<Button variant="outline" size="sm" onClick={() => void refresh()} disabled={reads.isFetching || locked}>{reads.isFetching ? 'Refreshing…' : 'Refresh contract data'}</Button>}
    feedback={feedback} wallet={snapshot ? walletSection : null} buy={buyForm} sell={sellForm}
    details={snapshot ? <><LaunchFacts snapshot={snapshot} tokens={tokens} now={now} />{rawResponses}</> : null}
  />;
  return <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8 py-6">
    <header className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{params?.metadata.name || 'Bonding curve launch'}</h1>
      <p className="text-sm text-muted-foreground">Live contract data on Stellar Testnet. Reads refresh every 15 seconds.</p>
      <p className="break-all font-mono text-sm">{address}</p>
      <Button className="self-start" variant="outline" onClick={() => void refresh()} disabled={reads.isFetching || locked}>
        {reads.isFetching ? 'Refreshing…' : 'Refresh contract data'}
      </Button>
      <Button className="self-start" variant="outline" render={<Link href={`/trade/${address}`} />} nativeButton={false}>Trade</Button>
    </header>
    {!isReady || (!snapshot && !coreError) ? <p role="status">Loading contract data…</p> : null}
    {coreError && <p role="alert" className="break-words text-sm text-destructive">Could not read this bonding curve: {coreError}. Check the address and retry.</p>}
    {snapshot && <>
      <LaunchFacts snapshot={snapshot} tokens={tokens} now={now} />
      {(tokensRead.error || decodedTokens.error) && <p role="alert" className="break-words text-sm text-destructive">Token data unavailable: {decodedTokens.error || errorMessage(tokensRead.error)}. Trading is unavailable until the token identities can be verified.</p>}
      {!tokens && !tokensRead.error && !decodedTokens.error && <p role="status">Loading token identities and vault balances…</p>}
      {walletSection}
      {tokens && <section className="flex flex-col gap-5" aria-labelledby="trade-heading">
        <h2 id="trade-heading" className="text-xl font-semibold">Buy / sell</h2>
        <p className="text-sm text-muted-foreground">Amounts use 7 decimal places. If a trustline is missing, approve its setup first, then approve the trade. Keep XLM available for fees and account reserves.</p>
        <div className="grid gap-8 md:grid-cols-2">
          {buyForm}
          {sellForm}
        </div>
      </section>}
      {rawResponses}
    </>}
  </div>;
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(180px,2fr)_3fr]">
    {rows.map(([label, value]) => <div key={label} className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mb-2 min-w-0 whitespace-pre-wrap break-words tabular-nums sm:mb-0">{value}</dd>
    </div>)}
  </dl>;
}

function date(seconds: bigint) {
  const value = new Date(Number(seconds) * 1000);
  return Number.isNaN(value.getTime()) ? `${seconds} Unix seconds` : `${value.toUTCString()} (${seconds})`;
}

function percent(bps: bigint) { return `${bps / BigInt(100)}.${(bps % BigInt(100)).toString().padStart(2, '0')}%`; }

function LaunchFacts({ snapshot: s, tokens: t, now }: { snapshot: Snapshot; tokens?: Tokens; now: bigint }) {
  const c = s.config;
  const p = c.params;
  const pair = t ? (t.pair.isNative() ? 'XLM' : t.pairSymbol) : 'pair tokens';
  const asset = p.metadata.symbol;
  const tokenAmount = (value: bigint) => `${formatAmount(value)} ${asset}`;
  const pairAmount = (value: bigint) => `${formatAmount(value)} ${pair}`;
  const target = p.curve.graduation_target;
  const remaining = target > s.state.quote_reserve ? target - s.state.quote_reserve : BigInt(0);
  const progress = target > BigInt(0) ? (s.state.quote_reserve * BigInt(10_000)) / target : BigInt(0);
  const cliff = p.starts_at + p.vesting.cliff_seconds;
  return <>
    <section className="flex flex-col gap-3" aria-labelledby="status-heading">
      <h2 id="status-heading" className="text-xl font-semibold">Status and graduation</h2>
      <Facts rows={[
        ['Contract status (ledger time)', s.status],
        ['Start date passed', s.status === 'Scheduled' ? 'No' : 'Yes'],
        ['End date passed (browser clock)', now >= p.ends_at ? 'Yes' : 'No'],
        ['Launch over', s.status === 'Failed' || s.status === 'Graduated' ? 'Yes' : 'No'],
        ['Buys available', s.status === 'Open' && !s.state.busy && s.state.sold < c.buckets.curve ? 'Yes — subject to wallet funds and trustlines' : 'No'],
        ['Sell-back available', (s.status === 'Open' || s.status === 'Failed') && !s.state.busy && s.state.sold > BigInt(0) ? 'Yes — requires a held curve position' : 'No'],
        ['Graduated', s.state.graduated ? 'Yes' : 'No'],
        ['Graduation target reached', s.state.quote_reserve >= target ? 'Yes' : 'No'],
        ['Current graduation amount', pairAmount(s.state.quote_reserve)],
        ['Graduation target', pairAmount(target)],
        ['Graduation progress', percent(progress)],
        ['Still needed', pairAmount(remaining)],
        ['Starts at', date(p.starts_at)], ['Ends at', date(p.ends_at)],
        ['Current marginal price (before fee)', `${pairAmount(s.price)} per ${asset}`],
        ['Distinct buyers recorded', s.buyers.toString()],
        ['Buyer count in state', s.state.buyer_count.toString()],
        ['Net tokens sold', tokenAmount(s.state.sold)],
        ['Curve inventory remaining', tokenAmount(c.buckets.curve - s.state.sold)],
        ['Contract busy', s.state.busy ? 'Yes' : 'No'],
      ]} />
      <p className="text-sm text-muted-foreground">Graduation uses net pair reserves, excluding trading fees. Buyer count records distinct buying addresses and does not decrease when they sell. Contract status determines the trading window; the browser clock is informational.</p>
    </section>
    <section className="flex flex-col gap-3" aria-labelledby="config-heading">
      <h2 id="config-heading" className="text-xl font-semibold">Launch configuration</h2>
      <Facts rows={[
        ['Name', p.metadata.name], ['Symbol', asset], ['Description', p.metadata.description], ['Logo URL', p.metadata.logo],
        ['Creator', p.owner], ['Factory', c.factory], ['Platform', c.platform],
        ['Launch token contract', p.asset], ['Pair token contract', p.pair],
        ['Token identity', t?.assetName ?? 'Loading…'], ['Pair identity', t?.pairName ?? 'Loading…'],
        ['Token decimals', t?.assetDecimals.toString() ?? 'Loading…'], ['Pair decimals', t?.pairDecimals.toString() ?? 'Loading…'],
        ['Total supply', tokenAmount(c.total_supply)],
        ['Curve allocation', `${tokenAmount(c.buckets.curve)} (${percent(p.allocations.curve_bps)})`],
        ['Pool allocation', `${tokenAmount(c.buckets.pool)} (${percent(p.allocations.pool_bps)})`],
        ['Team allocation', `${tokenAmount(c.buckets.team)} (${percent(p.allocations.team_bps)})`],
        ['Initial virtual token reserve', tokenAmount(p.curve.virtual_base_reserve)],
        ['Initial virtual pair reserve', pairAmount(p.curve.virtual_quote_reserve)],
        ['Creator trading fee', `${percent(p.curve.creator_fee_bps)} (${p.curve.creator_fee_bps} bps)`],
        ['Creator graduation payout share', percent(p.curve.creator_payout_bps)],
        ['Platform graduation fee share', percent(c.platform_fee_bps)],
        ['Accrued unclaimed creator fees', pairAmount(s.state.creator_fees)],
        ['Actual vault token balance', t ? tokenAmount(t.vaultAssetBalance) : 'Loading…'],
        ['Actual vault pair balance', t ? pairAmount(t.vaultPairBalance) : 'Loading…'],
      ]} />
    </section>
    <section className="flex flex-col gap-3" aria-labelledby="vesting-heading">
      <h2 id="vesting-heading" className="text-xl font-semibold">Team vesting</h2>
      <Facts rows={[
        ['Cliff duration', `${p.vesting.cliff_seconds} seconds`], ['Vesting duration after cliff', `${p.vesting.duration_seconds} seconds`],
        ['Unlock schedule', p.vesting.schedule], ['Cliff ends', date(cliff)],
        ['Fully vested at', p.vesting.duration_seconds === BigInt(0) ? 'Immediately — no vesting delay' : date(cliff + p.vesting.duration_seconds)],
        ['Team tokens already claimed', tokenAmount(s.state.team_claimed)],
        ['Team tokens claimable now', tokenAmount(s.claimableTeam)],
        ['Team tokens remaining', tokenAmount(c.buckets.team - s.state.team_claimed)],
      ]} />
      <p className="text-sm text-muted-foreground">A zero vesting duration makes the full team allocation immediately claimable. Otherwise, vesting uses the launch start, configured cliff, and stepped unlocks. Monthly periods are fixed at 30 days. The creator can claim team tokens and trading fees through the contract.</p>
    </section>
    <section className="flex flex-col gap-3" aria-labelledby="preview-heading">
      <h2 id="preview-heading" className="text-xl font-semibold">Graduation accounting preview</h2>
      <Facts rows={[
        ['Creator payout', pairAmount(s.preview.creator_payout)], ['Platform fee', pairAmount(s.preview.platform_fee)],
        ['Pair tokens earmarked for pool', pairAmount(s.preview.pool_pair_amount)],
        ['Launch tokens earmarked for pool', tokenAmount(s.preview.pool_asset_amount)],
        ['Unsold curve tokens', tokenAmount(s.preview.unsold_curve_amount)],
      ]} />
      <p className="text-sm text-muted-foreground">These values are calculated from current reserves. This contract version does not create a pool or transfer graduation proceeds. Graduation stops curve trading.</p>
    </section>
  </>;
}
