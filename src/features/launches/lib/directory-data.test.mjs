import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(api) {
  const exports = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('./directory-data.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    { exports, require: () => api, Error },
  );
  return exports;
}

test('complete collection reads all pages once and preserves network, owner and cancellation', async () => {
  const calls = [], signal = new AbortController().signal;
  const { getDirectory } = load({
    getLaunchList: async (network, page, limit, owner, receivedSignal) => {
      calls.push({ network, page, limit, owner, signal: receivedSignal });
      return {
        page, limit, total: 45,
        launches: Array.from({ length: page === 3 ? 5 : 20 }, (_, i) => ({
          contractId: String((page - 1) * 20 + i),
        })),
      };
    },
  });
  const result = await getDirectory('public', 'owner', signal);
  assert.equal(result.complete, true);
  assert.equal(result.launches.length, 45);
  assert.deepEqual(calls.map((c) => c.page), [1, 2, 3]);
  assert.ok(calls.every((c) => c.network === 'public' && c.owner === 'owner' && c.signal === signal));
});

test('large directories do not fetch the entire dataset', async () => {
  let calls = 0;
  const { getDirectory } = load({
    getLaunchList: async () => {
      calls++;
      return { page: 1, limit: 20, total: 201, launches: [] };
    },
  });
  assert.equal((await getDirectory('testnet')).complete, false);
  assert.equal(calls, 1);
});

test('changing counts, duplicate pages, failed reads and cancellation never return partial global results', async () => {
  for (const mode of ['changed', 'duplicate', 'failed', 'aborted']) {
    const { getDirectory } = load({
      getLaunchList: async (_network, page) => {
        if (page === 2 && (mode === 'failed' || mode === 'aborted'))
          throw new Error(mode);
        return {
          page, limit: 20, total: mode === 'changed' && page === 2 ? 22 : 21,
          launches: Array.from({ length: page === 1 ? 20 : 1 }, (_, i) => ({
            contractId: String(mode === 'duplicate' ? i : (page - 1) * 20 + i),
          })),
        };
      },
    });
    await assert.rejects(getDirectory('testnet'), mode === 'failed' || mode === 'aborted'
      ? new RegExp(mode) : /changed while loading/);
  }
});

test('empty directory is complete without extra requests', async () => {
  const { getDirectory } = load({
    getLaunchList: async () => ({ page: 1, limit: 20, total: 0, launches: [] }),
  });
  const result = await getDirectory('testnet');
  assert.equal(result.complete, true);
  assert.equal(result.launches.length, 0);
});

test('market reads have at most four simultaneous requests and retain real zero activity', async () => {
  let active = 0, maximum = 0;
  const signal = new AbortController().signal;
  const { getDirectoryMarkets } = load({
    getMarket: async (contractId, network, receivedSignal) => {
      assert.equal(network, 'public');
      assert.equal(receivedSignal, signal);
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return { contractId, volume24h: { tradeCount: 0, grossPairAmount: '0' } };
    },
  });
  const result = await getDirectoryMarkets(
    Array.from({ length: 9 }, (_, i) => ({ contractId: String(i) })), 'public', signal,
  );
  assert.equal(maximum, 4);
  assert.equal(result.size, 9);
  assert.equal(result.get('0').volume24h.tradeCount, 0);
  await assert.rejects(getDirectoryMarkets(Array(41).fill({}), 'public'), /directory size/);
});

test('market failure rejects ranking instead of sorting incomplete metrics', async () => {
  const { getDirectoryMarkets } = load({ getMarket: async () => { throw new Error('offline'); } });
  await assert.rejects(getDirectoryMarkets([{ contractId: 'a' }], 'testnet'), /offline/);
});
