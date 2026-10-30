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
const OWNER = '0x' + '1'.repeat(40), CURVE = '0x' + '2'.repeat(40), ASSET = '0x' + '3'.repeat(40), PAIR = '0x' + '4'.repeat(40);
const APPROVAL = '0x' + 'a'.repeat(64), TRADE = '0x' + 'b'.repeat(64);
function harness(options = {}) {
  const state = { chain: 84532, held: 10n ** 20n, pairHeld: 100000000n, rights: 10n ** 20n, allowance: 0n, gas: 10n ** 18n, owner: OWNER, ready: true, ...options };
  const events = [], queue = [], values = [], refs = [], effects = [], cache = new Map();
  let index = 0, refIndex = 0, effectIndex = 0, rendering = false, scheduled = false, current;
  const connector = { getChainId: async () => state.chain };
  const connection = { address: OWNER, connector };
  const launch = { contractId: CURVE, network: 'testnet', slug: 'actual-suffixed-slug', asset: ASSET, pair: PAIR, assetDecimals: 18, pairDecimals: 6, metadata: { symbol: 'TOK' } };
  const quote = options.side === 'sell' ? { gross: 20000000n, creator_fee: 100000n, user_amount: 19900000n, amount_received: 19900000n } : { gross: 20000000n, creator_fee: 100000n, user_amount: 20100000n, amount_received: 10n ** 18n };
  const refresh = () => { events.push('refresh'); return Promise.resolve(); };
  const react = {
    useState(initial) { const i = index++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial;
      return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; schedule(); }]; },
    useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial }; },
    useEffect: effect, useLayoutEffect: effect,
  };
  function effect(fn, deps) {
    const i = effectIndex++, previous = effects[i];
    if (!deps || !previous || deps.some((item, index) => item !== previous.deps?.[index])) {
      effects[i] = { fn, deps, pending: true, cleanup: previous?.cleanup };
    }
  }
  function schedule() { if (!scheduled) { scheduled = true; queueMicrotask(() => { scheduled = false; render(); }); } }
  const result = data => ({ data, isError: false, isFetching: false, refetch: async () => result(typeof data === 'function' ? data() : data) });
  function read(options) {
    assert.equal(options.chainId, 84532); assert.match(options.scopeKey, /^base:testnet:/);
    const get = () => options.functionName === 'balanceOf' ? options.address === PAIR ? state.pairHeld : state.held
      : options.functionName === 'allowance' ? state.allowance : options.functionName === 'sellable_balance' ? state.rights : { ...quote, ...(state.changedQuote ? { amount_received: 2n } : {}) };
    return { ...result(get()), refetch: async () => { events.push('read:' + options.functionName); return result(get()); } };
  }
  const wagmi = {
    useConnection: () => { connection.address = state.owner; return connection; },
    useSwitchChain: () => ({ switchChainAsync: async ({ chainId }) => { events.push('switch'); if (state.failedSwitch) throw new Error('Switch rejected'); state.chain = chainId; } }),
    useWriteContract: () => ({ writeContractAsync: async request => {
      events.push('write:' + request.functionName); assert.equal(request.account, OWNER); assert.equal(request.chainId, 84532); assert.equal('value' in request, false);
      if (request.functionName === 'approve') {
        assert.equal(request.address, options.side === 'sell' ? ASSET : PAIR); assert.equal(request.args[0], CURVE);
        if (state.approvalRejected) throw new Error('Approval rejected');
        state.allowance = request.args[1];
        if (state.afterApproval) { state.afterApproval(state, render); render(); }
        return APPROVAL;
      }
      assert.equal(request.address, CURVE); state.request = request; return TRADE;
    } }),
    useReadContract: read,
    useBalance: () => ({ ...result({ value: state.gas }), refetch: async () => result({ value: state.gas }) }),
    useBytecode: () => result(state.ownerCode ?? (state.smart ? '0x1234' : undefined)),
    useEstimateGas: () => result(21000n), useEstimateFeesPerGas: () => result({ maxFeePerGas: 1000000000n }),
    useSimulateContract: request => ({ refetch: async () => {
      events.push('simulate:' + request.functionName);
      if (state.simulationFailed && request.functionName !== 'approve') return { isError: true, error: new Error('Simulation reverted') };
      return { data: { result: true, request }, isError: false };
    } }),
    useWaitForTransactionReceipt: ({ hash }) => {
      if (!hash) return result(undefined);
      const abi = load('lib/base/launchAbi.ts').launchAbi;
      const eventName = options.side === 'sell' ? 'Sold' : 'Bought';
      const topics = viem.encodeEventTopics({ abi, eventName, args: eventName === 'Bought' ? { buyer: OWNER } : { seller: OWNER } });
      const data = viem.encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], eventName === 'Bought' ? [20100000n, 10n ** 18n, 100000n] : [10n ** 18n, 19900000n, 100000n]);
      events.push('receipt:' + (hash === APPROVAL ? 'approval' : 'trade'));
      return result({ status: hash === APPROVAL && state.approvalReverted ? 'reverted' : 'success', logs: hash === TRADE ? [{ address: CURVE, data, topics }] : [] });
    },
  };
  function load(name) {
    const file = resolve(root, name); if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { module, exports: module.exports, Error, TextEncoder,
      require: name => name === 'react' ? react : name === 'wagmi' ? wagmi
        : name === '@/lib/launchpad' ? { useLaunchpad: () => ({ address: state.owner, accountReady: state.ready, baseSigningSupported: true, account: state.ready ? { status: 'registered', profile: { userId: 'did:privy:test' } } : { status: 'signed-out' } }) }
        : name === './use-base-launch-reads' ? { useBaseLaunchReads: () => ({ chainId: 84532, curve: CURVE, asset: ASSET, pair: PAIR, pairSymbol: 'USDC', unavailable: state.unavailable, revalidate: async () => { if (state.unavailable) throw new Error(state.unavailable); } }) }
        : name === '@/lib/api/client' ? { getApiBaseUrl: () => 'https://original.api/v1' }
        : name === '@/lib/api/launches/trade-queue' ? { releaseTradeReceipt() {}, enqueueTrade: (...args) => { events.push('queue'); queue.push(args); return true; } }
        : name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(resolve(dirname(file), name + '.ts')) : require(name),
    }, { filename: file }); return module.exports;
  }
  const hook = load('features/base/use-base-trade-form.ts').useBaseTradeForm;
  function render() {
    if (rendering) return; rendering = true; index = refIndex = effectIndex = 0;
    current = hook(launch, options.side ?? 'buy', false, () => {}, refresh);
    for (const item of effects) if (item?.pending) { item.pending = false; item.cleanup?.(); item.cleanup = item.fn(); }
    rendering = false; return current;
  }
  render();
  return { state, events, queue, launch, render, get model() { return current.model; }, async enter(value) { current.model.setEntry(value); await new Promise(resolve => setImmediate(resolve)); }, async submit() { await current.model.submit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); } };
}
for (const allowance of [0n, 10n ** 30n]) test(`buy uses the launch pair spender; allowance ${allowance === 0n ? 'requires approval' : 'skips approval'}`, async () => {
  const h = harness({ allowance }); await h.enter('20.1'); await h.submit();
  assert.equal(h.state.request?.functionName, 'buy'); assert.deepEqual(Array.from(h.state.request.args), [OWNER, 20100000n, 995000000000000000n]);
  assert.equal(h.events.filter(x => x === 'write:approve').length, allowance === 0n ? 1 : 0);
  if (allowance === 0n) assert.ok(h.events.indexOf('receipt:approval') < h.events.indexOf('write:buy'));
  assert.equal(h.events.filter(x => x === 'write:buy').length, 1); assert.equal(h.queue.length, 1);
  assert.equal(h.queue[0][4], 'actual-suffixed-slug'); assert.equal(h.queue[0][5].userId, 'did:privy:test');
  assert.equal(h.model.confirmation?.token.decimals, 18);
});
test('sell approves the asset, limits original-buyer rights, and applies slippage to net pair output', async () => {
  const h = harness({ side: 'sell' }); await h.enter('1'); await h.submit();
  assert.equal(h.state.request?.functionName, 'sell'); assert.equal(h.state.request.args[2], 19800500n); assert.equal(h.model.confirmation?.token.amount, 10n ** 18n);
});
test('a linked EIP-7702 EOA can submit a normal trade without changing delegation', async () => {
  const h = harness({ ownerCode: '0xef0100' + '6'.repeat(40) });
  await h.enter('20.1'); await h.submit();
  assert.equal(h.state.request?.functionName, 'buy');
  assert.equal(h.events.filter(event => event === 'write:buy').length, 1);
});
for (const [name, patch] of [
  ['approval rejection', { approvalRejected: true }], ['approval revert', { approvalReverted: true }],
  ['failed switch', { chain: 1, failedSwitch: true }], ['gas funds', { gas: 1n }], ['pair funds inclusive of fee', { pairHeld: 20000000n }],
  ['smart wallet', { smart: true }], ['simulation failure', { simulationFailed: true }],
  ['changed quote after approval', { afterApproval: s => { s.changedQuote = true; } }],
  ['wallet change after approval', { afterApproval: s => { s.owner = '0x' + '5'.repeat(40); } }],
  ['logout and back to same DID', { afterApproval: (s, render) => { s.ready = false; render(); s.ready = true; render(); } }],
  ['insufficient refetched allowance', { afterApproval: s => { s.allowance = 0n; } }],
]) test(`${name} prevents the trade signature`, async () => {
  const h = harness(patch); await h.enter('20.1'); await h.submit(); assert.equal(h.state.request, undefined); assert.ok(h.model.error); assert.equal(h.queue.length, 0);
});
for (const rights of [0n, 10n ** 17n]) test(`transfer-only/insufficient sell rights (${rights}) block selling positive held tokens`, async () => {
  const h = harness({ side: 'sell', rights }); await h.enter('1'); assert.equal(h.model.sellable, rights); await h.submit(); assert.equal(h.state.request, undefined);
});
test('excess fractional input never reaches a signature', async () => {
  const h = harness(); await h.enter('1.0000001'); assert.match(h.model.inputError, /6 decimal/); await h.submit(); assert.equal(h.state.request, undefined);
});

test('a mined trade is never replayed by a second submit while its report is pending', async () => {
  const h = harness({ allowance: 10n ** 30n }); await h.enter('20.1'); await h.submit(); await h.submit();
  assert.equal(h.events.filter(event => event === 'write:buy').length, 1); assert.equal(h.queue.length, 1);
});
