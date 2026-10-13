import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
for (const surface of ['launch', 'trade'])
  test(`${surface} on Public ignores cached Testnet RPC values and never enables Testnet reads`, () => {
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
        useBlux: () => ({ user: null, isReady: true }),
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
          return {};
        },
      },
      '@stellar/stellar-sdk': {
        StrKey: { isValidEd25519PublicKey: () => false },
      },
      '@/components/ui/button': { Button: 'Button' },
      '@/lib/launchpad': {
        useLaunchpad: () => ({ login() {}, retryStatusCheck() {} }),
      },
      '@/app/create/_launch/transactions': {
        API_NETWORK: 'testnet',
        NETWORK: 'Testnet passphrase',
      },
      '@/lib/api/client': { ApiError: class ApiError extends Error {} },
      '@/lib/api/launches/queries': {
        usePageVisible: () => true,
        useLaunchDetail: () => ({
          data: {
            metadata: { name: 'Public launch' },
            network: 'public',
            bonding: null,
          },
        }),
      },
      '@/lib/api/launches/use-trade-queue': {
        useTradeQueue: () => ({ records: [], recoveryError: false }),
      },
      '@/lib/api/launches/trade-queue': { resumeTradeIdentity() {} },
      '../_components/indexed-launch-overview': {
        IndexedLaunchOverview: 'IndexedLaunchOverview',
      },
      '@/components/ui/card': { cardVariants: () => '' },
      '@/app/trade/[slug]/_components/bonding-trade-layout': {
        BondingTradeLayout: 'BondingTradeLayout',
      },
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
      surface,
    });
    assert.equal(result.props.snapshot, undefined);
    assert.equal(result.props.network, 'public');
    assert.ok(observers.every((observer) => observer.enabled === false));
    if (surface === 'trade') {
      assert.equal(result.props.loading, false);
      assert.equal(result.props.buy, null);
      assert.equal(result.props.sell, null);
    }
  });
