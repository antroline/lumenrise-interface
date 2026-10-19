import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function load(api) {
  const exports = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('./directory-data.ts', import.meta.url), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText,
    { exports, require: () => api },
  );
  return exports;
}
test('one backend read per page preserves server order, total, filters and cancellation', async () => {
  const signal = new AbortController().signal,
    calls = [];
  const result = {
    page: 2,
    limit: 20,
    total: 501,
    launches: [
      { contractId: 'z', bonding: null },
      { contractId: 'a', createdAt: null },
    ],
  };
  const { getDirectory } = load({
    getLaunchList: async (...args) => {
      calls.push(args);
      return result;
    },
  });
  const request = {
    network: 'public',
    owner: 'owner',
    search: 'alpha',
    category: 'bonding-curve',
    sort: 'almostGraduated',
    direction: 'desc',
    pair: '',
    page: 2,
    limit: 20,
  };
  assert.equal(await getDirectory(request, signal), result);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['public', 2, 20, 'owner', signal, request]);
});
test('400, 503 and aborted reads propagate rather than becoming empty results', async () => {
  for (const status of [400, 503, 'aborted']) {
    const error = new Error(String(status));
    const { getDirectory } = load({
      getLaunchList: async () => {
        throw error;
      },
    });
    await assert.rejects(
      getDirectory({ network: 'testnet', page: 1, limit: 20 }),
      (actual) => actual === error,
    );
  }
});
