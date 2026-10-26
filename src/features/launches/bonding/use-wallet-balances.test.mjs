import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import ts from 'typescript';

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const responses = new Map([['asset', '20000000'], ['pair', '30000000'], ['launch', '10000000']]);
  const network = { NETWORK: 'testnet' };
  let reads = [];
  const requests = [];
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('./use-wallet-balances.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mocks = {
    '@bluxcc/react': {
      async readContracts(calls, config) {
        assert.equal(calls.length, 1, 'Each balance must fail independently');
        requests.push({ ...calls[0], network: config.network });
        const response = await responses.get(calls[0].address);
        if (response instanceof Error) throw response;
        return { values: [response] };
      },
    },
    '@tanstack/react-query': {
      useQuery(options) {
        reads.push(options);
        const observerOptions = { ...options, _optimisticResults: 'optimistic' };
        return new QueryObserver(client, observerOptions).getOptimisticResult(observerOptions);
      },
    },
    '@/lib/stellar/network': network,
    './contract': {
      integer(value) {
        if (typeof value !== 'string' || !/^-?\d+$/.test(value)) throw new Error('Invalid balance');
        return BigInt(value);
      },
    },
  };
  runInNewContext(source, { module, exports: module.exports, require: (name) => mocks[name] });
  const defaults = { address: 'launch', asset: 'asset', pair: 'pair', owner: 'wallet-a', enabled: true };
  function render(overrides = {}) {
    reads = [];
    return module.exports.useWalletBalances({ ...defaults, ...overrides });
  }
  return {
    render, responses, requests, network,
    fetch: () => Promise.allSettled(reads.map(options => client.fetchQuery(options))),
  };
}

test('initial reads load independently; disabled reads remain idle', () => {
  const h = harness();
  assert.ok(Object.values(h.render().balanceStatus).every(value => value === 'loading'));
  assert.ok(Object.values(h.render({ enabled: false }).balanceStatus).every(value => value === 'idle'));
  assert.equal(h.requests.length, 0);
});

for (const failed of ['asset', 'pair', 'launch']) {
  test(`failure of ${failed} does not hide the other wallet values`, async () => {
    const h = harness();
    h.responses.set(failed, new Error('RPC simulation failed'));
    h.render();
    await h.fetch();
    const result = h.render();
    for (const [contract, field, expected] of [['asset', 'held', 20000000n], ['pair', 'pairHeld', 30000000n], ['launch', 'position', 10000000n]]) {
      assert.equal(result.balances[field], contract === failed ? undefined : expected);
      assert.equal(result.balanceStatus[field], contract === failed ? 'error' : 'ready');
    }
  });
}

for (const failure of [new Error('Offline'), undefined, '1.5', 'invalid']) {
  test(`failed or invalid refresh (${String(failure)}) retains cached balance and recovers`, async () => {
    const h = harness();
    h.render();
    await h.fetch();
    h.responses.set('pair', failure);
    await h.fetch();
    let result = h.render();
    assert.equal(result.balances.pairHeld, 30000000n);
    assert.equal(result.balanceStatus.pairHeld, 'stale');
    assert.equal(result.balanceStatus.held, 'ready');
    h.responses.set('pair', '0');
    await h.fetch();
    result = h.render();
    assert.equal(result.balances.pairHeld, 0n);
    assert.equal(result.balanceStatus.pairHeld, 'ready');
  });
}

test('cached balances never leak across wallet, launch, token or network changes', async () => {
  const h = harness();
  h.render();
  await h.fetch();
  for (const overrides of [{ owner: 'wallet-b' }, { address: 'other-launch' }]) {
    assert.ok(Object.values(h.render(overrides).balances).every(value => value === undefined));
  }
  assert.equal(h.render({ pair: 'other-pair' }).balances.pairHeld, undefined);
  assert.equal(h.render({ asset: 'other-asset' }).balances.held, undefined);
  h.network.NETWORK = 'public';
  assert.ok(Object.values(h.render().balances).every(value => value === undefined));
});

test('polling after an initial failure keeps the error until recovery instead of flashing a skeleton', async () => {
  const h = harness();
  h.responses.set('pair', new Error('Offline'));
  h.render();
  await h.fetch();
  assert.equal(h.render().balanceStatus.pairHeld, 'error');
  let finishRead;
  h.responses.set('pair', new Promise(resolve => { finishRead = resolve; }));
  const pending = h.fetch();
  assert.equal(h.render().balanceStatus.pairHeld, 'error');
  finishRead('50000000');
  await pending;
  const recovered = h.render();
  assert.equal(recovered.balanceStatus.pairHeld, 'ready');
  assert.equal(recovered.balances.pairHeld, 50000000n);
});
