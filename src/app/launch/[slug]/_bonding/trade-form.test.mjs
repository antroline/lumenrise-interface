import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url)),
  require = createRequire(import.meta.url);
const { Asset, Keypair, Networks } = require('@stellar/stellar-sdk');
const owner = Keypair.random().publicKey(),
  address = 'launch-contract';
const quote = { gross: '10000000', creator_fee: '0', user_amount: '10000000' };
function load(filename, mocks = {}, globals = {}) {
  const path = resolve(directory, filename),
    module = { exports: {} };
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  runInNewContext(output, {
    module,
    exports: module.exports,
    Error,
    ...globals,
    require: (name) =>
      name in mocks
        ? mocks[name]
        : name.startsWith('.')
          ? load(resolve(dirname(path), `${name}.ts`), mocks, globals)
          : require(name),
  });
  return module.exports;
}
function harness({
  side = 'buy',
  registrationStored = true,
  pending = null,
  confirmation = 'success',
  storageBlocked = false,
} = {}) {
  const events = [],
    states = [],
    storage = new Map(),
    key = `launchpad:pending-trade:${Networks.TESTNET}:${address}:${owner}`;
  if (pending) storage.set(key, pending);
  let stateIndex = 0,
    writes = 0;
  const jsx = (type, props) => ({ type, props });
  const mockUi = (name) => ({ [name]: name });
  const mocks = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        const value =
          index < 2 ? '1' : typeof initial === 'function' ? initial() : initial;
        return [value, (next) => states.push(next)];
      },
      useRef: (initial) => ({ current: initial }),
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@bluxcc/react': {
      useBlux: () => ({
        user: { address: owner },
        isReady: true,
        sendTransaction() {
          throw new Error('Unexpected trustline submission');
        },
      }),
      useWriteContract: () => ({
        mutateAsync: async () => {
          events.push('broadcast');
          writes++;
          return { hash: 'new-hash' };
        },
      }),
      useReadContracts: () => ({
        data: { values: [quote] },
        isFetching: false,
      }),
      readContracts: async () => ({
        values: [quote, '100000000', '100000000', '100000000'],
      }),
    },
    '@/components/ui/button': mockUi('Button'),
    '@/components/ui/input': mockUi('Input'),
    '@/components/ui/field': Object.fromEntries(
      ['Field', 'FieldDescription', 'FieldGroup', 'FieldLabel'].map((n) => [
        n,
        n,
      ]),
    ),
    '@/lib/api/launches/queries': { usePageVisible: () => true },
    '@/lib/api/launches/trade-queue': {
      enqueueTrade(network, id, hash, trader) {
        events.push(`queue:${hash}`);
        assert.equal(network, 'testnet');
        assert.equal(id, address);
        assert.equal(trader, owner);
        return registrationStored;
      },
    },
    '@/app/create/_launch/transactions': {
      API_NETWORK: 'testnet',
      NETWORK: Networks.TESTNET,
      soroban: { getTransaction: async () => ({ status: 'NOT_FOUND' }) },
    },
    './trade': {
      confirmTransaction: async (hash) => {
        events.push(`confirm:${hash}`);
        assert.ok(events.includes(`queue:${hash}`));
        if (confirmation !== 'success') throw new Error('Still pending');
      },
      ensureTradeTrustlines: async () => ({}),
      checkReceivingCapacity() {},
    },
  };
  const globals = {
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem(key, value) {
        if (storageBlocked) throw new Error('Storage blocked');
        storage.set(key, value);
      },
      removeItem(key) {
        if (storageBlocked) throw new Error('Storage blocked');
        storage.delete(key);
      },
    },
  };
  const { TradeForm } = load('trade-form.tsx', mocks, globals);
  const form = TradeForm({
    address,
    network: 'testnet',
    side,
    snapshot: { state: { busy: false }, status: 'Open' },
    tokens: {
      asset: Asset.native(),
      pair: Asset.native(),
      assetSymbol: 'TOK',
      pairSymbol: 'XLM',
    },
    locked: false,
    setLocked() {},
    refresh: async () => events.push('refresh'),
  });
  return {
    events,
    states,
    storage,
    key,
    writes: () => writes,
    submit: () => form.props.onSubmit({ preventDefault() {} }),
  };
}
for (const side of ['buy', 'sell'])
  test(`${side} persists the server hash immediately after broadcast and confirms independently`, async () => {
    const h = harness({ side });
    await h.submit();
    assert.deepEqual(h.events, [
      'broadcast',
      'queue:new-hash',
      'confirm:new-hash',
      'refresh',
    ]);
    assert.equal(h.writes(), 1);
    assert.equal(h.storage.has(h.key), false);
    assert.ok(
      h.states.includes(`${side === 'buy' ? 'Buy' : 'Sell'} confirmed.`),
    );
  });
test('registration persistence failure never becomes a false on-chain failure or another broadcast', async () => {
  const h = harness({ registrationStored: false, storageBlocked: true });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.ok(h.states.includes('Buy confirmed.'));
  assert.ok(h.events.includes('refresh'));
});
test('unresolved confirmation preserves the original on-chain hash', async () => {
  const h = harness({ confirmation: 'pending' });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.equal(h.storage.get(h.key), 'new-hash');
});
test('recovering an old on-chain hash queues that hash and never buys or sells again', async () => {
  const h = harness({ pending: 'old-hash' });
  await h.submit();
  assert.equal(h.writes(), 0);
  assert.deepEqual(h.events, ['queue:old-hash', 'confirm:old-hash', 'refresh']);
});
