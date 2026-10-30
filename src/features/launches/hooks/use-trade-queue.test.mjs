import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

for (const chain of ['stellar', 'base']) for (const network of ['testnet', 'public']) {
  test(`${chain}/${network} confirmation refreshes shared launch data and project volumes only in its original namespace`, () => {
    const client = new QueryClient();
    const listeners = new EventTarget(), effects = [], module = { exports: {} };
    const source = ts.transpileModule(readFileSync(new URL('./use-trade-queue.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const queue = { QUEUE_EVENT: 'queued', REGISTERED_EVENT: 'registered', readTradeQueue: () => [], resumeTradeIdentity() {}, flushTradeQueue() {}, registrationRecorded() {} };
    const mocks = {
      react: { useEffect: fn => effects.push(fn), useState: value => [value, () => {}] },
      '@tanstack/react-query': { useQueryClient: () => client },
      '@/lib/launchpad': { useLaunchpad: () => ({ account: { status: 'signed-out' } }) },
      '@/lib/api/client': { getApiChain: () => 'stellar' },
      '@/lib/chain-address': { sameAddress: (a, b) => a === b },
      '@/lib/networks/context': {}, './queries': { usePageVisible: () => false },
      '../../../lib/api/launches/trade-queue': queue,
    };
    runInNewContext(source, { module, exports: module.exports, Event, AbortController, window: listeners, clearInterval() {},
      require(name) { assert.ok(name in mocks, name); return mocks[name]; },
    });
    const affected = ['detail', 'market', 'trades', 'chart', 'holders'].map(section => ['launch', chain, network, 'persisted', section]);
    affected.push(['launch-list', { chain, network, page: 1 }], ['launch-list', { chain, network, page: 2, sort: 'topVolume' }]);
    const unaffected = [['launch', chain, network === 'public' ? 'testnet' : 'public', 'persisted', 'market'], ['launch-list', { chain: chain === 'base' ? 'stellar' : 'base', network }]];
    for (const key of [...affected, ...unaffected]) client.setQueryData(key, {});
    module.exports.useConfirmationRecovery(network);
    const cleanups = effects.map(effect => effect());
    listeners.dispatchEvent(new CustomEvent('registered', { detail: { record: { chain, network, action: 'launch' }, launches: [{ slug: 'persisted' }] } }));
    for (const key of affected) assert.equal(client.getQueryState(key).isInvalidated, true, JSON.stringify(key));
    for (const key of unaffected) assert.equal(client.getQueryState(key).isInvalidated, false, JSON.stringify(key));
    for (const cleanup of cleanups) cleanup?.();
    client.clear();
  });
}
