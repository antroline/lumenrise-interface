'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useBlux, useReadContracts } from '@bluxcc/react';
import { StrKey } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotify } from '@/components/ui/toast';
import { useLaunchpad } from '@/lib/launchpad';
import { API_NETWORK, NETWORK } from '@/lib/stellar/network';
import {
  decodeSnapshot,
  decodeTokens,
  errorMessage,
  trusts,
} from './contract';
import { TradeForm } from './trade-form';
import { useWalletBalances } from './use-wallet-balances';
import { ApiError } from '@/lib/api/client';
import {
  useLaunchDetail,
  usePageVisible,
} from '@/features/launches/hooks/queries';
import { useTradeQueue } from '@/features/launches/hooks/use-trade-queue';
import { resumeTradeIdentity } from '@/lib/api/launches/trade-queue';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { IndexedLaunchOverview } from '../components/indexed-launch-overview';
import { BondingTechnicalDetails } from '../components/bonding-technical-details';
import { LaunchPageSkeleton } from '../components/launch-page-skeleton';

function decodeRead<T>(
  values: readonly unknown[] | undefined,
  decode: (values: readonly unknown[]) => T,
) {
  try {
    return { value: values ? decode(values) : undefined, error: undefined };
  } catch (cause) {
    return { value: undefined, error: errorMessage(cause) };
  }
}

export function BondingCurvePage({
  slug,
  network = API_NETWORK,
}: {
  slug: string;
  network?: ApiNetwork;
}) {
  const { user, isReady, isAuthenticated } = useBlux();
  const notify = useNotify();
  const lastTradingNotice = useRef<string | null>(null);
  const { retryStatusCheck, loginPending } = useLaunchpad();
  const indexed = useLaunchDetail(slug, network);
  const address = indexed.data?.contractId ?? '';
  const { records: queued, recoveryError } = useTradeQueue(network, address, indexed.data?.slug ?? undefined);
  const visible = usePageVisible();
  const liveEnabled = visible && !!address && network === API_NETWORK;
  const queueFeedback = queued.some(
    (trade) => trade.state === 'invalid' || trade.state === 'identity',
  ) ? (
    <p role="status" className="text-small text-muted-foreground">
      {queued.some((t) => t.state === 'invalid')
        ? 'A trade could not be recorded. Its transaction confirmation is unchanged.'
        : 'Sign in again to finish recording your trades.'}
      {queued.some((t) => t.state === 'identity') && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            retryStatusCheck();
            if (user?.address)
              resumeTradeIdentity(network, address, user.address);
          }}
        >
          Retry account verification
        </Button>
      )}
    </p>
  ) : null;
  const indexedFeedback = (
    <>
      {indexed.isPending && <p role="status">Loading launch information…</p>}
      {indexed.isError && (
        <p role="alert" className="text-small text-muted-foreground">
          {indexed.error instanceof ApiError && indexed.error.status === 404
            ? 'This launch is unavailable or has not been indexed yet. Try again in a moment.'
            : indexed.error instanceof ApiError && indexed.error.status === 400
              ? 'The project slug or network is invalid.'
              : 'Launch information is temporarily unavailable.'}{' '}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void indexed.refetch()}
          >
            Retry
          </Button>
        </p>
      )}
      {network !== API_NETWORK && (
        <p className="text-small text-muted-foreground">
          Wallet trading is configured for {API_NETWORK === 'public' ? 'Mainnet' : 'Testnet'}.
        </p>
      )}
      {queueFeedback}
      {recoveryError && (
        <p role="status" className="text-small text-muted-foreground">
          Trade registration will be checked again. Keep your transaction hashes
          until recorded.
        </p>
      )}
    </>
  );
  const [locked, setLocked] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const reads = useReadContracts(
    [
      'get_config',
      'get_state',
      'status',
      'current_price',
      'buyer_count',
      'claimable_team',
      'graduation_preview',
    ].map((fn) => ({ address, fn, args: [] })),
    { network: NETWORK },
    { enabled: isReady && liveEnabled, refetchInterval: 15_000, retry: false },
  );
  const decoded = decodeRead(
    network === API_NETWORK ? reads.data?.values : undefined,
    decodeSnapshot,
  );
  const snapshot = decoded.value;
  const params = snapshot?.config.params;
  const tokensRead = useReadContracts(
    [
      ...['name', 'symbol', 'decimals'].map((fn) => ({
        address: params?.asset ?? '',
        fn,
        args: [],
      })),
      ...['name', 'symbol', 'decimals'].map((fn) => ({
        address: params?.pair ?? '',
        fn,
        args: [],
      })),
      { address: params?.asset ?? '', fn: 'balance', args: [address] },
      { address: params?.pair ?? '', fn: 'balance', args: [address] },
    ],
    { network: NETWORK },
    {
      enabled: isReady && liveEnabled && !!params,
      refetchInterval: 15_000,
      retry: false,
    },
  );
  const decodedTokens = decodeRead(
    network === API_NETWORK ? tokensRead.data?.values : undefined,
    (values) => {
      if (!snapshot) throw new Error('Launch configuration is unavailable.');
      const tokens = decodeTokens(values, snapshot.config, NETWORK);
      if (
        tokens.assetDecimals !== BigInt(7) ||
        tokens.pairDecimals !== BigInt(7)
      )
        throw new Error(
          'This page requires the contract’s 7-decimal Stellar assets.',
        );
      return tokens;
    },
  );
  const tokens = decodedTokens.value;
  const owner = user?.address;
  const validWallet = !!owner && StrKey.isValidEd25519PublicKey(owner);
  const accountEnabled = isReady && liveEnabled && validWallet;
  const wallet = useWalletBalances({
    address,
    owner,
    asset: params?.asset ?? '',
    pair: params?.pair ?? '',
    enabled: accountEnabled && !!params,
  });
  const account = useAccount(
    { address: owner, network: NETWORK },
    {
      enabled: accountEnabled,
      refetchInterval: 15_000,
      retry: false,
    },
  );

  async function refresh() {
    if (!mounted.current || !liveEnabled) return;
    await Promise.allSettled([
      reads.refetch(),
      ...(params ? [tokensRead.refetch()] : []),
      ...(validWallet && params
        ? [wallet.refetch(), account.refetch()]
        : []),
    ]);
  }

  const coreError =
    network === API_NETWORK
      ? decoded.error || (reads.error && errorMessage(reads.error))
      : undefined;
  const missingTrustlines =
    accountEnabled &&
    account.isSuccess &&
    !!account.data &&
    !!tokens &&
    (!trusts(account.data, tokens.asset) || !trusts(account.data, tokens.pair));
  const missingAccount = accountEnabled && account.isSuccess && account.data === null;
  const accountReadFailed = accountEnabled && account.isError;
  // Polls and retries must not bring back the initial wallet-loading placeholder.
  const loadingWallet =
    accountEnabled &&
    !missingAccount &&
    !accountReadFailed &&
    !account.isFetched && account.isLoading;
  const hasWalletFeedback =
    !validWallet || missingAccount || accountReadFailed || missingTrustlines || loadingWallet;
  const walletFeedback =
    user && isReady && isAuthenticated && !loginPending && hasWalletFeedback ? (
      <>
        {!validWallet && (
          <p role="alert" className="text-destructive">
            A Stellar account address is required to trade.
          </p>
        )}
        {missingAccount && (
          <p className="text-muted-foreground">
            To trade on {API_NETWORK === 'public' ? 'Mainnet' : 'Testnet'}, activate this wallet with XLM.
          </p>
        )}
        {accountReadFailed && (
          <p className="text-muted-foreground">
            Wallet information is temporarily unavailable.{' '}
            <button
              type="button"
              className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
              disabled={account.isFetching}
              onClick={() => void account.refetch()}
            >
              Retry
            </button>
          </p>
        )}
        {missingTrustlines && (
          <p className="text-muted-foreground">
            Missing trustlines require a separate wallet approval. Keep XLM for
            fees and reserves.
          </p>
        )}

        {loadingWallet && (
          <div
            role="status"
            aria-label="Loading wallet information"
            aria-busy="true"
            className="flex items-center gap-2 py-1"
          >
            <Skeleton className="h-3 w-20 motion-reduce:animate-none" />
            <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
          </div>
        )}
      </>
    ) : null;
  const buyForm =
    snapshot && tokens
      ? (quoteHost: HTMLElement | null, active: boolean) => (
          <TradeForm
            key={`buy:${owner ?? 'disconnected'}`}
            slug={indexed.data?.slug ?? undefined}
            address={address}
            network={network}
            snapshot={snapshot}
            tokens={tokens}
            side="buy"
            quoteHost={quoteHost}
            active={active}
            compact
            locked={locked}
            setLocked={setLocked}
            refresh={refresh}
            balances={network === API_NETWORK ? wallet.balances : undefined}
            balanceStatus={network === API_NETWORK ? wallet.balanceStatus : undefined}
          />
        )
      : null;
  const sellForm =
    snapshot && tokens
      ? (quoteHost: HTMLElement | null, active: boolean) => (
          <TradeForm
            key={`sell:${owner ?? 'disconnected'}`}
            slug={indexed.data?.slug ?? undefined}
            address={address}
            network={network}
            snapshot={snapshot}
            tokens={tokens}
            side="sell"
            quoteHost={quoteHost}
            active={active}
            compact
            locked={locked}
            setLocked={setLocked}
            refresh={refresh}
            balances={network === API_NETWORK ? wallet.balances : undefined}
            balanceStatus={network === API_NETWORK ? wallet.balanceStatus : undefined}
          />
        )
      : null;
  const rawResponses = (
    <details className="min-w-0 border-t border-border pt-5">
      <summary className="cursor-pointer font-semibold">
        Raw contract responses
      </summary>
      <pre className="mt-3 max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-xs">
        {JSON.stringify(
          {
            get_config: reads.data?.values[0],
            get_state: reads.data?.values[1],
            status: reads.data?.values[2],
            current_price: reads.data?.values[3],
            buyer_count: reads.data?.values[4],
            claimable_team: reads.data?.values[5],
            graduation_preview: reads.data?.values[6],
            contractError: coreError,
            tokenError:
              decodedTokens.error ||
              (tokensRead.error && errorMessage(tokensRead.error)),
          },
          (_, value: unknown) =>
            typeof value === 'bigint' ? value.toString() : value,
          2,
        )}
      </pre>
    </details>
  );
  const tradingError =
    network === API_NETWORK &&
    (coreError || tokensRead.error || decodedTokens.error);
  const tradingNotice = tradingError
    ? decoded.error || decodedTokens.error
      ? 'Token details could not be verified. Trading is temporarily unavailable.'
      : 'Could not connect to the network to load trading data.'
    : null;
  useEffect(() => {
    if (!visible) return;
    if (!tradingNotice) {
      if (tokens) lastTradingNotice.current = null;
      return;
    }
    const key = network + ':' + address + ':' + tradingNotice;
    if (lastTradingNotice.current === key) return;
    lastTradingNotice.current = key;
    notify(tradingNotice, { tone: 'error' });
  }, [address, network, tradingNotice, tokens, visible, notify]);
  const pageLoading =
    indexed.isPending || (!!address && network === API_NETWORK && !snapshot && !coreError);
  if (
    indexed.isPending &&
    !indexed.data &&
    !snapshot &&
    !indexed.isError &&
    !coreError
  )
    return <LaunchPageSkeleton />;

  return (
    <IndexedLaunchOverview
      address={address}
      network={network}
      launch={indexed.data}
      snapshot={snapshot}
      tokens={tokens}
      buy={buyForm}
      sell={sellForm}
      walletFeedback={walletFeedback}
      tradingLoading={
        !!address && network === API_NETWORK &&
        (!isReady ||
          (!snapshot && !coreError) ||
          (!!snapshot && !tokens && !tokensRead.error && !decodedTokens.error))
      }
      loading={pageLoading}
      feedback={indexedFeedback}
    >
      <BondingTechnicalDetails
        address={address}
        network={network}
        launch={indexed.data}
        snapshot={snapshot}
        tokens={tokens}
        loading={pageLoading}
      >
        {snapshot && rawResponses}
      </BondingTechnicalDetails>
    </IndexedLaunchOverview>
  );
}
