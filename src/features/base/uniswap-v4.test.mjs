import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url), root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const viem = require('viem');
function loader(mocks = {}) {
  const cache = new Map(), browserWindow = new EventTarget();
  return function load(name) {
    const file = resolve(root, name); if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { module, exports: module.exports, Error, TextEncoder, setTimeout, clearTimeout, AbortController, window: mocks.__window ?? browserWindow,
      require: name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(resolve(dirname(file), name + '.ts')) : require(name),
    }, { filename: file }); return module.exports;
  };
}
const v4 = loader()('lib/base/uniswap-v4.ts');
const A = '0x' + '1'.repeat(40), B = '0x' + '2'.repeat(40), C = '0x' + '3'.repeat(40);
const key = { currency0: A, currency1: B, fee: 3000, tickSpacing: 60, hooks: viem.zeroAddress };
const id = v4.poolId(key), Q96 = 1n << 96n;
test('sqrt price keeps exact atomic-unit ratios for both orders and unequal decimals', () => {
  assert.equal(v4.v4AssetPrice(Q96 * 2n, key, A, 18), 4n * 10n ** 18n);
  assert.equal(v4.v4AssetPrice(Q96 * 2n, key, B, 6), 250000n);
  const sqrt = 5505400448681967349566181336224857653n;
  const liveKey = { ...key, currency0: '0x1670503bC03d1d5a0cA14a07c005cf48E2d27f15', currency1: '0xB73AcbA04E751dA7F81556bc1DFeA8608E5F8D4B' };
  assert.equal(v4.v4AssetPrice(sqrt, liveKey, liveKey.currency1, 18), 207n);
  assert.equal(v4.formatV4Price(1n << 192n, sqrt * sqrt, 18, 6), '0.000207100591');
  assert.equal(v4.formatV4Price(1n, 10n ** 30n, 18, 6), '0.000000000000000001');
  assert.throws(() => v4.v4AssetPrice(0n, key, A, 18));
});
test('pool identity binds currency ordering, pair, fee, tick spacing and no hooks', () => {
  v4.verifyPool(key, id, A, B);
  for (const invalid of [{ ...key, hooks: C }, { ...key, currency0: B, currency1: A }, { ...key, fee: 500 }, { ...key, tickSpacing: 0 }])
    assert.throws(() => v4.verifyPool(invalid, id, A, B));
  assert.throws(() => v4.verifyPool(key, id, A, C));
});
test('router input uses the pinned five-field single-swap tuple and settles/takes with enforced limits', () => {
  for (const input of [A, B]) {
    const encoded = v4.encodeV4Swap(key, input, 1000000n, 1234n);
    const [actions, params] = viem.decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }], encoded);
    assert.equal(actions, '0x060c0f');
    const [swap] = viem.decodeAbiParameters([{ type: 'tuple', components: [
      { name: 'poolKey', type: 'tuple', components: v4.poolKeyComponents }, { name: 'zeroForOne', type: 'bool' },
      { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' }, { name: 'hookData', type: 'bytes' },
    ] }], params[0]);
    assert.equal(swap.zeroForOne, input === A); assert.equal(swap.amountIn, 1000000n); assert.equal(swap.amountOutMinimum, 1234n); assert.equal(swap.hookData, '0x');
    assert.deepEqual(viem.decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], params[1]), [input, 1000000n]);
    assert.deepEqual(viem.decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], params[2]), [input === A ? B : A, 1234n]);
  }
  assert.throws(() => v4.encodeV4Swap(key, A, 1n << 128n, 1n));
  assert.throws(() => v4.encodeV4Swap(key, A, 1n, 0n));
});
test('receipt verification accepts only the selected manager, pool, router and direction', () => {
  const router = v4.V4_DEPLOYMENTS[84532].router, manager = v4.V4_DEPLOYMENTS[84532].manager;
  const topics = viem.encodeEventTopics({ abi: v4.v4Abi, eventName: 'Swap', args: { id, sender: router } });
  const data = viem.encodeAbiParameters([{ type: 'int128' }, { type: 'int128' }, { type: 'uint160' }, { type: 'uint128' }, { type: 'int24' }, { type: 'uint24' }], [-1000n, 2345n, Q96, 100n, 0, 3000]);
  const event = { address: manager, topics, data };
  const amounts = v4.v4ExecutedAmounts([event], manager, router, id, key, A);
  assert.equal(amounts.paid, 1000n); assert.equal(amounts.received, 2345n);
  for (const logs of [[], [{ ...event, address: C }]]) assert.throws(() => v4.v4ExecutedAmounts(logs, manager, router, id, key, A));
  assert.throws(() => v4.v4ExecutedAmounts([event], manager, C, id, key, A));
  assert.throws(() => v4.v4ExecutedAmounts([event], manager, router, id, key, B));
});

function poolHarness(patch = {}) {
  let options;
  const calls = [], deployment = v4.V4_DEPLOYMENTS[patch.chainId ?? 84532];
  const client = {
    getBlockNumber: async () => 123n,
    readContract: async request => {
      calls.push(request); assert.equal(request.blockNumber, 123n);
      const values = { get_state: { graduated: true, busy: false }, graduation_state: { settled: true, token_id: 33196n, pool_id: id }, getPoolAndPositionInfo: [key, 0n],
        ownerOf: C, getSlot0: [Q96, 0, 0, 3000], getLiquidity: 999n, poolManager: deployment.manager, ...patch.values };
      return values[request.functionName];
    },
  };
  const load = loader({ '@/lib/api/config': { getConfiguration: () => ({ chain: 'base', network: { configurations: { [patch.chainId === 8453 ? 'public' : 'testnet']: { uniswapV4: patch.missingConfig ? undefined : { poolManager: deployment.manager, stateView: deployment.stateView, positionManager: deployment.positions, ...patch.config } } } } }) }, '@tanstack/react-query': { useQuery: o => { options = o; return {}; } }, wagmi: { usePublicClient: () => client } });
  load('features/base/use-base-v4-pool.ts').useBaseV4Pool({ network: patch.chainId === 8453 ? 'public' : 'testnet', contractId: C, asset: A, pair: B, assetDecimals: 18, pairDecimals: 6, ...patch.launch });
  return { run: () => options.queryFn(), calls };
}
for (const chainId of [8453, 84532]) test(`pool discovery verifies the NFT, pool key and manager on ${chainId} at one block`, async () => {
  const h = poolHarness({ chainId }); const result = await h.run();
  assert.equal(result.graduation.token_id, 33196n); assert.equal(result.liquidity, 999n);
  assert.equal(h.calls.find(c => c.functionName === 'getPoolAndPositionInfo').address, v4.V4_DEPLOYMENTS[chainId].positions);
});
for (const [name, values] of [
  ['unsettled', { graduation_state: { settled: false } }], ['wrong owner', { ownerOf: A }],
  ['wrong deployment', { poolManager: C }], ['empty liquidity', { getLiquidity: 0n }], ['uninitialized', { getSlot0: [0n, 0, 0, 3000] }],
  ['wrong token pair', { getPoolAndPositionInfo: [{ ...key, currency1: C }, 0n] }],
]) test(`${name} blocks graduated pool discovery`, async () => { await assert.rejects(poolHarness({ values }).run()); });

function tradeHarness(options = {}) {
  const state = { chainId: 84532, side: 'buy', allowance: 0n, permitAmount: 0n, expiration: 0, balance: 100000000n, gas: 10n ** 18n, owner: C, output: 2000000n, ...options };
  const values = [], refs = [], effects = [], calls = [], queue = [], browserWindow = new EventTarget();
  let index = 0, refIndex = 0, effectIndex = 0, current, scheduled = false;
  const asset = state.assetIs0 ? A : B, pair = state.assetIs0 ? B : A;
  const deployment = v4.V4_DEPLOYMENTS[state.chainId], launch = { network: state.chainId === 8453 ? 'public' : 'testnet', contractId: C, asset, pair, assetDecimals: state.assetDecimals ?? 6, pairDecimals: state.pairDecimals ?? 6, metadata: { symbol: 'TOK' } };
  state.inputAmount = 10n ** BigInt(state.side === 'buy' ? launch.pairDecimals : launch.assetDecimals);
  const connector = { getChainId: async () => state.chainId };
  const connection = { address: C, connector };
  const schedule = () => { if (!scheduled) { scheduled = true; queueMicrotask(() => { scheduled = false; render(); }); } };
  function effect(fn, deps) {
    const i = effectIndex++, previous = effects[i];
    if (!deps || !previous || deps.some((item, i) => item !== previous.deps?.[i])) effects[i] = { fn, deps, pending: true, cleanup: previous?.cleanup };
  }
  const react = {
    useState(initial) { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value; schedule(); }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; }, useEffect: effect, useLayoutEffect: effect,
  };
  const quote = () => ({ gross: state.side === 'buy' ? state.inputAmount : state.output, creator_fee: 0n, user_amount: state.side === 'buy' ? state.inputAmount : state.output, amount_received: state.output });
  const pool = { graduation: { pool_id: id, token_id: 1n }, key, slot0: [Q96, 0, 0, 3000], price: 1000000n };
  const client = {
    watchContractEvent: request => { state.subscription = request; return () => { state.unsubscribed = true; }; },
    readContract: async r => { calls.push('read:' + r.functionName); return r.functionName === 'balanceOf' ? state.balance : r.address === v4.PERMIT2 ? [state.permitAmount, state.expiration, 0] : state.allowance; },
    getBytecode: async () => state.smart ? '0x1234' : undefined,
    getBlock: async () => ({ timestamp: 100n }), estimateGas: async () => 100000n,
    estimateFeesPerGas: async () => ({ maxFeePerGas: 1n }), getBalance: async () => state.gas,
    simulateContract: async r => {
      calls.push('simulate:' + r.functionName);
      if (r.functionName === 'quoteExactInputSingle') {
        if (state.deferQuote) return new Promise(resolve => { state.resolveQuote = () => resolve({ result: [state.output, 100000n] }); });
        return { result: [state.output, 100000n] };
      }
      if (state.simulationFailed && r.functionName === 'execute') throw new Error('Simulation failed');
      return { request: r, result: true };
    },
    waitForTransactionReceipt: async ({ hash }) => {
      if (hash !== '0x' + 'b'.repeat(64)) return { status: 'success', logs: [] };
      const zeroForOne = (state.side === 'buy' ? pair : asset) === A;
      return { status: state.reverted ? 'reverted' : 'success', logs: [{ address: deployment.manager,
        topics: viem.encodeEventTopics({ abi: v4.v4Abi, eventName: 'Swap', args: { id, sender: deployment.router } }),
        data: viem.encodeAbiParameters([{ type: 'int128' }, { type: 'int128' }, { type: 'uint160' }, { type: 'uint128' }, { type: 'int24' }, { type: 'uint24' }],
          [zeroForOne ? -state.inputAmount : state.output, zeroForOne ? state.output : -state.inputAmount, Q96, 100n, 0, 3000]),
      }] };
    },
  };
  const load = loader({
    __window: browserWindow, react,
    '@tanstack/react-query': { useQuery: o => { state.queryOptions = o; return ({ data: quote(), isError: false, isFetching: false, isPlaceholderData: false, error: null,
      refetch: async () => ({ data: await o.queryFn({ signal: new AbortController().signal }), isError: false }) }); } },
    wagmi: {
      useConnection: () => { connection.address = state.owner; return connection; }, useSwitchChain: () => ({ switchChainAsync: async () => {} }),
      useReadContract: () => ({ data: state.balance, refetch: async () => ({ data: state.balance }) }),
      useWriteContract: () => ({ writeContractAsync: async r => {
        calls.push('write:' + (r.address === v4.PERMIT2 ? 'permit2' : r.functionName));
        assert.equal(r.chainId, state.chainId); assert.equal(r.account, C);
        if (r.functionName === 'approve') {
          if (state.approvalRejected) throw new Error('Approval rejected');
          if (r.address === v4.PERMIT2) { assert.equal(r.args[0], state.side === 'buy' ? pair : asset); assert.equal(r.args[1], deployment.router); state.permitAmount = r.args[2]; state.expiration = r.args[3]; }
          else { assert.equal(r.args[0], v4.PERMIT2); state.allowance = r.args[1]; }
          if (state.afterApproval) { state.afterApproval(state); render(); }
          return '0x' + 'a'.repeat(64);
        }
        assert.equal(r.address, deployment.router); assert.equal(r.args[0], '0x10'); state.request = r;
        return '0x' + 'b'.repeat(64);
      } }),
    },
    '@/lib/launchpad': { useLaunchpad: () => ({ address: state.owner, account: { status: 'registered', profile: { userId: 'did:privy:v4' } }, accountReady: true, baseSigningSupported: true }) },
    './use-base-launch-reads': { useBaseLaunchReads: (l, scope, mode) => { assert.equal(mode, 'pool'); return { chainId: state.chainId, asset, pair, curve: C, revalidate: async () => { if (state.invalidPool) throw new Error('Invalid pool'); } }; } },
    './use-base-v4-pool': { useBaseV4Pool: () => ({ data: pool, client, chainId: state.chainId, deployment, refetch: async () => ({ data: pool }) }) },
    '@/lib/api/client': { getApiBaseUrl: () => 'https://api.test' },
    '@/lib/api/launches/trade-queue': { enqueueTrade: (...args) => { queue.push(args); return true; }, releaseTradeReceipt() {}, QUEUE_EVENT: 'queued', isTradeRecorded: () => !!state.recorded, readTradeQueue: () => state.recorded ? [] : queue.map(([network, contractId, transactionHash, traderAddress, slug, context]) => ({ ...context, network, contractId, transactionHash, traderAddress, slug, state: state.syncState ?? 'pending', error: state.syncError })) },
  });
  const hook = load('features/base/use-base-v4-trade-form.ts').useBaseV4TradeForm;
  function render() {
    index = 0; refIndex = 0; effectIndex = 0;
    current = hook(launch, state.side, false, () => {}, async () => { calls.push('refresh'); }, undefined, state.active ?? true);
    for (const e of effects) if (e?.pending) { e.pending = false; e.cleanup?.(); e.cleanup = e.fn(); }
    return current;
  }
  render(); current.model.setEntry('1'); render();
  return { state, calls, queue, render, syncEvent: () => browserWindow.dispatchEvent(new Event('queued')), model: () => current.model, submit: async () => { await new Promise(resolve => setTimeout(resolve, 320)); render(); await current.model.submit({ preventDefault() {} }); await Promise.resolve(); render(); } };
}
for (const chainId of [8453, 84532]) for (const side of ['buy', 'sell']) for (const assetIs0 of [false, true]) test(`graduated ${side} on ${chainId}, asset currency${assetIs0 ? 0 : 1}, approves Permit2 and routes exact input through v4`, async () => {
  const h = tradeHarness({ chainId, side, assetIs0 }); await h.submit();
  assert.equal(h.model().error, ''); assert.ok(h.model().confirmation);
  assert.deepEqual(h.calls.filter(c => c.startsWith('write:')), ['write:approve', 'write:permit2', 'write:execute']);
  assert.equal(h.queue.length, 1); assert.equal(h.state.permitAmount, 1000000n);
  assert.equal(h.calls.includes('read:sellable_balance'), false);
  await h.submit(); assert.equal(h.queue.length, 1);
});
test('adequate token and unexpired Permit2 allowances skip approvals', async () => {
  const h = tradeHarness({ allowance: 1000000n, permitAmount: 1000000n, expiration: 1000 }); await h.submit();
  assert.deepEqual(h.calls.filter(c => c.startsWith('write:')), ['write:execute']);
});
for (const [name, options] of [
  ['gas shortage', { gas: 0n }], ['insufficient input', { balance: 1n }], ['smart wallet', { smart: true }],
  ['pool verification failure', { invalidPool: true }], ['rejected approval', { approvalRejected: true }], ['reverted simulation', { simulationFailed: true }],
  ['wallet change', { afterApproval: s => { s.owner = A; } }], ['price movement', { afterApproval: s => { s.output = 1n; } }],
]) test(`${name} prevents a graduated swap signature`, async () => {
  const h = tradeHarness(options); await h.submit(); assert.ok(h.model().error); assert.equal(h.calls.includes('write:execute'), false);
});
test('a reverted swap releases the submitted hash for a reviewed retry', async () => {
  const h = tradeHarness({ reverted: true }); await h.submit(); assert.match(h.model().error, /reverted/); assert.equal(h.model().submittedHash, undefined);
});

for (const chainId of [8453, 84532]) test(`indexed pool metadata is verified against live settlement on ${chainId}`, async () => {
  const deployment = v4.V4_DEPLOYMENTS[chainId];
  const indexed = { ...key, poolId: id, poolManager: deployment.manager, stateView: deployment.stateView, positionManager: deployment.positions,
    sqrtPriceX96: '1', liquidity: '1' };
  const h = poolHarness({ chainId, launch: { pool: indexed } });
  const result = await h.run();
  assert.equal(result.slot0[0], Q96, 'Live state overrides the indexed price snapshot');
  assert.equal(result.liquidity, 999n, 'Live liquidity is independent of graduation or indexed liquidity');
  assert.equal(h.calls.some(c => c.functionName === 'getPoolAndPositionInfo'), false);
});
for (const patch of [{ currency0: C }, { currency0: B, currency1: A }, { hooks: C }, { poolId: '0x' + '0'.repeat(64) }, { poolManager: C }, { stateView: C }, { positionManager: C }])
  test(`inconsistent indexed pool ${Object.keys(patch).join(',')} blocks trading without discovery fallback`, async () => {
    const d = v4.V4_DEPLOYMENTS[84532];
    const h = poolHarness({ launch: { pool: { ...key, poolId: id, poolManager: d.manager, stateView: d.stateView, positionManager: d.positions, ...patch } } });
    await assert.rejects(h.run());
    assert.equal(h.calls.some(c => c.functionName === 'getPoolAndPositionInfo'), false);
  });
for (const patch of [{ missingConfig: true }, { config: { poolManager: C } }, { values: { get_state: { graduated: false, busy: false } } }, { values: { get_state: { graduated: true, busy: true } } }])
  test(`missing configuration or incomplete graduation cannot enable pool trading ${JSON.stringify(patch)}`, async () => {
    await assert.rejects(poolHarness(patch).run());
  });

test('pool Swap subscription refreshes existing views and filters by manager and pool ID', async () => {
  const h = tradeHarness();
  const request = h.state.subscription;
  assert.equal(request.address, v4.V4_DEPLOYMENTS[84532].manager);
  assert.equal(request.eventName, 'Swap'); assert.equal(request.args.id, id);
  request.onLogs([]); await Promise.resolve();
  assert.ok(h.calls.includes('refresh'));
  assert.equal(h.queue.length, 0, 'Events never append authoritative trade records');
});

test('changing input immediately hides the previous quote until debounce completes', async () => {
  const h = tradeHarness();
  await new Promise(resolve => setTimeout(resolve, 320)); h.render();
  assert.ok(h.model().quote);
  h.model().setEntry('2'); h.render();
  assert.equal(h.model().quote, undefined);
  assert.equal(h.model().quoteRead.isFetching, true);
  await h.model().submit({ preventDefault() {} });
  assert.equal(h.calls.some(call => call.startsWith('write:')), false);
});

for (const side of ['buy', 'sell']) for (const assetIs0 of [true, false]) test(`${side} retains mixed 18/6 decimals with asset currency${assetIs0 ? 0 : 1}`, async () => {
  const h = tradeHarness({ side, assetIs0, assetDecimals: 18, pairDecimals: 6, balance: 10n ** 30n });
  await h.submit(); assert.equal(h.model().error, ''); assert.ok(h.model().confirmation);
  assert.equal(h.state.permitAmount, side === 'buy' ? 1000000n : 10n ** 18n);
  assert.equal(h.state.request.args[2], 700n, 'A short chain-time deadline is enforced');
  const [, params] = viem.decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }], h.state.request.args[1][0]);
  const [, minimum] = viem.decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], params[2]);
  assert.equal(minimum, h.state.output * 9950n / 10000n, 'Slippage applies to quoted output');
});

test('a cancelled quote discards a late simulated response', async () => {
  const h = tradeHarness({ deferQuote: true });
  const controller = new AbortController();
  const pending = h.state.queryOptions.queryFn({ signal: controller.signal });
  controller.abort(); h.state.resolveQuote();
  await assert.rejects(pending, error => error.name === 'AbortError');
  assert.equal(h.calls.some(call => call.startsWith('write:')), false);
});

test('confirmed swaps stay successful through pending and failed synchronization, then become recorded', async () => {
  const h = tradeHarness(); await h.submit();
  assert.ok(h.model().confirmation); assert.match(h.model().registrationNotice, /pending/);
  h.state.syncState = 'invalid'; h.state.syncError = 'Receipt indexing unavailable'; h.syncEvent(); await Promise.resolve(); h.render();
  assert.ok(h.model().confirmation); assert.match(h.model().registrationNotice, /needs attention/);
  h.state.recorded = true; h.syncEvent(); await Promise.resolve(); h.render();
  assert.ok(h.model().confirmation); assert.match(h.model().registrationNotice, /recorded in activity/);
  assert.equal(h.calls.filter(call => call === 'write:execute').length, 1);
});

test('switching direction hides incompatible quotes and removes the inactive pool subscription', async () => {
  const h = tradeHarness();
  await new Promise(resolve => setTimeout(resolve, 320)); h.render(); assert.ok(h.model().quote);
  h.state.active = false; h.render(); assert.equal(h.model().quote, undefined); assert.equal(h.state.unsubscribed, true);
  h.state.active = true; h.render(); assert.equal(h.model().quote, undefined);
  await new Promise(resolve => setTimeout(resolve, 320)); h.render(); assert.ok(h.model().quote);
});
