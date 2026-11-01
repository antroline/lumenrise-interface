import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const C = '0x' + '1'.repeat(40), A = '0x' + '2'.repeat(40), P = '0x' + '3'.repeat(40);
function harness(patch = {}) {
  const state = { onChain: { graduated: false }, settlement: { settled: false }, owner: A, locked: false, ...patch };
  const launch = { network: 'testnet', contractId: C, slug: 'token', asset: A, pair: P, state: {}, metadata: { symbol: 'TOK' }, assetDecimals: 18, pairDecimals: 6, ...patch.launch };
  let index = 0; const values = [], calls = [], invalidations = [];
  const jsx = (type, props, key) => ({ type, props, key });
  const trade = { model: {}, balances: {} };
  const mocks = {
    react: { useState(initial) { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    wagmi: { useReadContract: request => ({ data: request.functionName === 'get_state' ? state.onChain : state.settlement }) },
    viem: require('viem'),
    '@/lib/launchpad': { useLaunchpad: () => ({ address: state.owner, account: { status: 'registered', profile: { userId: 'did:privy:test' } } }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async o => { invalidations.push(o.queryKey); } }) },
    '@/features/launches': { TradeFormView: 'view', launchKey: (network, slug) => ['launch', 'base', network, slug] },
    '@/lib/api/launches/display': { pairLabel: () => 'Pair token' },
    '@/lib/base/uniswap-v4': { graduationAbi: [] }, '@/lib/base/launchAbi': { launchAbi: [] },
    '../use-base-trade-form': { useBaseTradeForm: (...args) => { calls.push({ venue: 'curve', args }); return trade; } },
    '../use-base-v4-trade-form': { useBaseV4TradeForm: (...args) => { calls.push({ venue: 'pool', args }); return { ...trade, poolPricing: {} }; } },
  };
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL('./base-trade-form.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, require: name => { if (!(name in mocks)) throw Error('Missing mock ' + name); return mocks[name]; } });
  function render() {
    const root = module.exports.BaseTradeForm({ launch, side: 'buy', locked: state.locked, setLocked() {}, active: true });
    index = 0; root.type(root.props); // React repeats the render after a graduation latch changes.
    index = 0; const routed = root.type(root.props);
    routed.type(routed.props);
    return root;
  }
  render(); return { state, launch, calls, invalidations, render };
}

test('Base pre-graduation retains its curve venue and switches when the on-chain state graduates', () => {
  const h = harness(); assert.equal(h.calls.at(-1).venue, 'curve');
  const inputs = h.calls.at(-1).args[5]; inputs.setEntry('12.345'); inputs.setLimitEntry('1');
  h.state.onChain.graduated = true; h.render();
  assert.equal(h.calls.at(-1).venue, 'pool');
  assert.equal(h.calls.at(-1).args[5].entry, '12.345'); assert.equal(h.calls.at(-1).args[5].limitEntry, '1');
  h.state.onChain.graduated = false; h.render();
  assert.equal(h.calls.at(-1).venue, 'pool', 'Delayed snapshots cannot restore curve trading');
});
for (const launch of [{ state: { graduated: true } }, { bonding: { status: 'Graduated', state: { graduated: false } } }, { graduationState: { settled: true } }])
  test(`indexed graduation selects the pool even without indexed pool metadata: ${JSON.stringify(launch)}`, () => {
    const h = harness({ launch }); assert.equal(h.calls.at(-1).venue, 'pool');
  });
test('graduation preserves an in-flight curve transaction until it unlocks', () => {
  const h = harness({ locked: true });
  h.state.onChain.graduated = true; h.render(); assert.equal(h.calls.at(-1).venue, 'curve');
  h.state.locked = false; h.render(); assert.equal(h.calls.at(-1).venue, 'pool');
});
test('account, launch, and network changes isolate transaction preparations', () => {
  const h = harness(); const original = h.render().key;
  h.state.owner = P; assert.notEqual(h.render().key, original);
  h.launch.contractId = P; const changedLaunch = h.render().key; assert.notEqual(changedLaunch, original);
  h.launch.network = 'public'; assert.notEqual(h.render().key, changedLaunch);
});
test('post-swap refresh invalidates existing API views and wallet, pool, and quote queries', async () => {
  const h = harness({ launch: { state: { graduated: true } } });
  await h.calls.at(-1).args[4]();
  const keys = h.invalidations.map(key => key[0]);
  for (const key of ['launch', 'launch-list', 'readContract', 'balance', 'base-v4-pool', 'base-v4-quote']) assert.ok(keys.includes(key));
  assert.deepEqual(JSON.parse(JSON.stringify(h.invalidations.find(key => key[0] === 'launch'))), ['launch', 'base', 'testnet', 'token']);
});
