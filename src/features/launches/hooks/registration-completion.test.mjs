import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function harness(file, chain, network) {
  const listeners = new EventTarget();
  const state = { context: { chain, network, userId: 'original', apiBaseUrl: 'https://api.test' },
    completed: false, launch: undefined, queued: [], refreshes: 0, cleaned: 0 };
  let value, effect, cleanup;
  const queue = {
    QUEUE_EVENT: 'queued', tradeQueueKey: record => JSON.stringify([
      record.chain, record.network, record.userId, record.apiBaseUrl, record.action, record.contractId, record.transactionHash,
    ]),
    readTradeQueue: () => state.queued, isTradeRecorded: () => state.completed,
    readLaunchConfirmation: () => state.launch,
  };
  const mocks = {
    react: {
      useState: initial => { if (value === undefined) value = initial; return [value, next => { value = typeof next === 'function' ? next(value) : next; }]; },
      useEffect: fn => { effect = fn; },
    },
    'next/navigation': { useRouter: () => ({ refresh: () => state.refreshes++ }) },
    '@/lib/api/launches/trade-queue': queue,
    '@/lib/api/client': {
      getApiChain: () => state.context.chain, getApiNetwork: () => state.context.network,
      getApiUserId: () => state.context.userId, getApiBaseUrl: () => state.context.apiBaseUrl,
    },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { module, exports: module.exports, window: listeners, require: name => mocks[name] });
  const record = { ...state.context, contractId: 'curve', transactionHash: 'hash', action: 'launch' };
  function render(fn, ...args) { cleanup?.(); const result = fn(...args); cleanup = effect?.(); return result; }
  return { ...module.exports, state, record, render, read: () => value,
    emit: (type = 'queued') => listeners.dispatchEvent(new Event(type)) };
}

for (const chain of ['base', 'stellar']) for (const network of ['testnet', 'public']) {
  test(`${chain}/${network} pending launch observes background completion with the persisted slug`, () => {
    const h = harness('../../create-launch/hooks/use-launch-operation.ts', chain, network);
    const onCompleted = () => h.state.cleaned++;
    const [, setOperation] = h.render(h.useLaunchOperation, onCompleted);
    setOperation({ status: 'pending', step: 'index', hash: 'hash', registration: h.record });
    h.render(h.useLaunchOperation, onCompleted);
    h.emit(); assert.equal(h.read().status, 'pending');
    h.state.launch = { contractId: 'other', slug: 'wrong' };
    h.emit(); assert.equal(h.read().status, 'pending');
    h.state.launch = { contractId: 'curve', slug: 'persisted-server-slug' };
    h.state.context.userId = 'another'; h.emit(); assert.equal(h.read().status, 'pending');
    h.state.context.userId = 'original'; h.emit('storage');
    assert.equal(h.read().status, 'success');
    assert.equal(h.read().slug, 'persisted-server-slug');
    assert.equal(h.state.cleaned, 1); assert.equal(h.state.refreshes, 1);
  });

  test(`${chain}/${network} trade success requires a completed result, including after reload`, () => {
    const h = harness('./use-trade-registration.ts', chain, network);
    const record = { ...h.record, action: 'trade' };
    h.render(h.useTradeRegistration, record);
    assert.equal(h.read().status, 'pending', 'Missing queue entries are not completion evidence');
    h.state.queued = [{ ...record, state: 'invalid' }]; h.emit();
    assert.equal(h.read().status, 'attention');
    h.state.queued = [{ ...record, state: 'pending' }]; h.emit();
    assert.equal(h.read().status, 'pending');
    h.state.completed = true; h.state.queued = []; h.emit('storage');
    assert.equal(h.read().status, 'completed');
    assert.equal(h.render(h.useTradeRegistration, { ...record, transactionHash: 'new' }), 'pending');
  });
}
