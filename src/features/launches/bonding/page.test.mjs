import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
for (const state of ['loaded', 'initial', 'error', 'refresh', 'wallet-ready'])
  test(`launch on Public (${state}) keeps loading and network isolation correct`, () => {
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
        useBlux: () => ({ user: state === 'wallet-ready' ? { address: 'connected-wallet' } : null, isReady: true }),
        useReadContracts: (_calls, _network, options) => {
          observers.push(options);
          return {
            data: { values: ['cached testnet data'] },
            error: new Error('Old Testnet error'),
            refetch() {},
          };
        },
        useAccount: (_params, options) => {
          observers.push(options);
          return state === 'wallet-ready' ? { data: { balances: [] } } : {};
        },
      },
      '@stellar/stellar-sdk': {
        StrKey: { isValidEd25519PublicKey: () => state === 'wallet-ready' },
      },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/toast': { useNotify: () => () => {} },
      '@/lib/launchpad': {
        useLaunchpad: () => ({ login() {}, retryStatusCheck() {} }),
      },
      '@/lib/stellar/network': {
        API_NETWORK: 'testnet',
        NETWORK: 'Testnet passphrase',
      },
      '@/lib/api/client': { ApiError: class ApiError extends Error {} },
      '@/features/launches/hooks/queries': {
        usePageVisible: () => true,
        useLaunchDetail: () => ({
          data: state === 'loaded' || state === 'refresh' ? {
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
    assert.ok(observers.every((observer) => observer.enabled === false));
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
  });
