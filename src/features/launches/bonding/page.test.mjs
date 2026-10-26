import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
for (const state of ['loaded', 'initial', 'error', 'refresh', 'wallet-ready', 'wallet-missing', 'wallet-pending', 'wallet-read-error', 'wallet-refresh-error', 'wallet-disabled-null', 'wallet-no-result', 'wallet-account-retrying', 'wallet-balances-pending', 'wallet-balances-retrying', 'wallet-balances-idle', 'wallet-background-refresh', 'wallet-connecting', 'wallet-incomplete-session', 'wallet-invalid-address'])
  test(`launch on Public (${state}) keeps loading and network isolation correct`, () => {
    const walletConnected = state.startsWith('wallet-');
    const incompleteAddress = ['wallet-connecting', 'wallet-incomplete-session', 'wallet-invalid-address'].includes(state);
    const accountEnabled = walletConnected && state !== 'wallet-ready' && state !== 'wallet-disabled-null';
    const observers = [],
      module = { exports: {} };
    const jsx = (type, props) => ({ type, props });
    const source = ts.transpileModule(
      readFileSync(resolve(directory, 'bonding-curve-page.tsx'), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText;
    const mocks = {
      react: {
        useState: (initial) => [
          typeof initial === 'function' ? initial() : initial,
          () => {},
        ],
        useEffect() {},
        useRef: (initial) => ({ current: initial }),
      },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
      '@bluxcc/react': {
        useBlux: () => ({
          user: walletConnected ? { address: incompleteAddress ? '' : 'connected-wallet' } : null,
          isReady: true,
          isAuthenticated: walletConnected && state !== 'wallet-incomplete-session',
        }),
        useReadContracts: (_calls, _network, options) => {
          observers.push(options);
          if (_calls[0]?.fn === 'balance' && state.startsWith('wallet-balances-')) return {
            isLoading: state !== 'wallet-balances-idle',
            isFetched: state === 'wallet-balances-retrying',
            refetch() {},
          };
          return {
            data: accountEnabled ? undefined : { values: ['cached testnet data'] },
            error: new Error('Old Testnet error'),
            refetch() {},
          };
        },
        useAccount: (_params, options) => {
          observers.push(options);
          if (state === 'wallet-ready') return { data: { balances: [] } };
          if (state === 'wallet-account-retrying') return { isLoading: true, isFetched: true };
          if (state.startsWith('wallet-balances-') || state === 'wallet-background-refresh') return {
            data: { balances: [] }, isSuccess: true, isFetched: true,
            isFetching: state === 'wallet-background-refresh', isLoading: false,
          };
          if (state === 'wallet-pending') return { isLoading: true, isSuccess: false };
          if (state === 'wallet-read-error' || state === 'wallet-refresh-error') return {
            data: state === 'wallet-refresh-error' ? null : undefined,
            isSuccess: false,
            isError: true,
          };
          if (state === 'wallet-no-result') return { data: null, isSuccess: false };
          return { data: null, isSuccess: true };
        },
      },
      '@stellar/stellar-sdk': {
        StrKey: { isValidEd25519PublicKey: () => walletConnected && !incompleteAddress },
      },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/toast': { useNotify: () => () => {} },
      '@/lib/launchpad': {
        useLaunchpad: () => ({ login() {}, retryStatusCheck() {}, loginPending: state === 'wallet-connecting' }),
      },
      '@/lib/stellar/network': {
        API_NETWORK: accountEnabled ? 'public' : 'testnet',
        NETWORK: 'Testnet passphrase',
      },
      '@/lib/api/client': { ApiError: class ApiError extends Error {} },
      '@/features/launches/hooks/queries': {
        usePageVisible: () => true,
        useLaunchDetail: () => ({
          data: state === 'loaded' || state === 'refresh' || walletConnected ? {
            contractId: 'contract',
            metadata: { name: 'Public launch' },
            network: 'public',
            bonding: null,
          } : undefined,
          isPending: state === 'initial',
          isFetching: state === 'initial' || state === 'refresh',
          isError: state === 'error',
          error: state === 'error' ? new Error('Launch information unavailable') : undefined,
          refetch() {},
        }),
      },
      '@/features/launches/hooks/use-trade-queue': {
        useTradeQueue: () => ({ records: [], recoveryError: false }),
      },
      '@/lib/api/launches/trade-queue': { resumeTradeIdentity() {} },
      '../components/indexed-launch-overview': {
        IndexedLaunchOverview: 'IndexedLaunchOverview',
      },
      '../components/bonding-technical-details': {
        BondingTechnicalDetails: 'BondingTechnicalDetails',
      },
      '../components/launch-page-skeleton': {
        LaunchPageSkeleton: 'LaunchPageSkeleton',
      },
      '@/components/ui/card': { cardVariants: () => '' },
      '@/components/ui/skeleton': { Skeleton: 'Skeleton' },
      '@/features/launches/trading/trade-disclosure': { TradeDisclosure: 'TradeDisclosure' },
      './trade-form': { TradeForm: 'TradeForm' },
      './use-wallet-balances': {
        useWalletBalances: (options) => {
          observers.push(options);
          return { balances: {}, balanceStatus: {}, refetch() {} };
        },
      },
      './contract': {
        decodeSnapshot() {
          assert.fail('Cached Testnet values must not be decoded on Public');
        },
        errorMessage: (e) => e.message,
      },
    };
    runInNewContext(source, {
      module,
      exports: module.exports,
      require: (name) => {
        if (!(name in mocks)) throw new Error(`Missing mock ${name}`);
        return mocks[name];
      },
    });
    const result = module.exports.BondingCurvePage({
      address: 'contract',
      network: 'public',
    });
    if (!accountEnabled) assert.ok(observers.every((observer) => observer.enabled === false));
    else assert.equal(observers.at(-1).enabled, !incompleteAddress);
    if (state === 'initial') {
      assert.equal(result.type, 'LaunchPageSkeleton');
      return;
    }
    assert.equal(result.type, 'IndexedLaunchOverview');
    assert.equal(result.props.snapshot, undefined);
    assert.equal(result.props.network, 'public');
    assert.equal(result.props.tradingLoading, false);
    assert.equal(result.props.buy, null);
    assert.equal(result.props.sell, null);
    if (state === 'wallet-ready') assert.equal(result.props.walletFeedback, null, 'A connected wallet without a message must not render an empty feedback panel');
    const feedback = JSON.stringify(result.props.walletFeedback);
    if (state === 'wallet-connecting' || state === 'wallet-incomplete-session') {
      assert.equal(result.props.walletFeedback, null, 'An incomplete login must not display wallet errors behind Blux');
    }
    if (state === 'wallet-invalid-address') {
      assert.ok(feedback.includes('A Stellar account address is required to trade.'));
      assert.ok(feedback.includes('"role":"alert"'));
    }
    assert.ok(!feedback.includes('This wallet is not funded'));
    if (state === 'wallet-missing') {
      assert.ok(feedback.includes('activate this wallet with XLM'));
      assert.ok(!feedback.includes('"role":"alert"'));
      assert.ok(!feedback.includes('Loading wallet information'));
    }
    if (state === 'wallet-pending') {
      assert.ok(feedback.includes('Loading wallet information'));
      assert.ok(!feedback.includes('activate this wallet'));
    }
    if (state === 'wallet-read-error' || state === 'wallet-refresh-error') {
      assert.ok(feedback.includes('Wallet information is temporarily unavailable'));
      assert.ok(feedback.includes('Retry'));
      assert.ok(!feedback.includes('activate this wallet'));
      assert.ok(!feedback.includes('Loading wallet information'));
    }
    if (state === 'wallet-disabled-null' || state === 'wallet-no-result') assert.equal(result.props.walletFeedback, null);
    if (['wallet-account-retrying', 'wallet-balances-pending', 'wallet-balances-retrying', 'wallet-balances-idle', 'wallet-background-refresh'].includes(state)) {
      assert.equal(result.props.walletFeedback, null, 'Only the initial active fetch may show a wallet skeleton');
    }
  });
