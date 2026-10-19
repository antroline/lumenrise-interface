import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const exports = {};
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('./directory.ts', import.meta.url), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports, URLSearchParams },
);
const { directoryHref, directoryPage, directorySort, directoryCategory } =
  exports;
const request = {
  network: 'testnet',
  owner: 'owner',
  search: 'Token & +%',
  category: 'bonding-curve',
  sort: 'topVolume',
  direction: 'asc',
  pair: 'payment-contract',
  page: 3,
  limit: 50,
};
test('pagination retains all combined filters and exact literal search', () => {
  const params = new URL(directoryHref(request, { page: 4 }), 'http://local')
    .searchParams;
  for (const [key, value] of Object.entries({ ...request, page: 4 }))
    assert.equal(params.get(key), String(value));
  assert.equal(directoryPage(101, 3, 50).pageCount, 3);
  assert.equal(directoryPage(0, 1).pageCount, 0);
  assert.equal(directoryPage(101, 99, 50).page, 3);
});
test('every request-control change resets page to one while preserving owner', () => {
  for (const [key, value] of Object.entries({
    network: 'public',
    owner: 'other',
    search: 'literal',
    category: 'all',
    sort: 'trending',
    direction: 'desc',
    pair: 'other-pair',
    limit: 20,
  })) {
    const params = new URL(
      directoryHref(request, { [key]: value }),
      'http://local',
    ).searchParams;
    assert.equal(params.get('page'), '1', key);
    assert.equal(params.get(key), String(value));
    if (key !== 'owner') assert.equal(params.get('owner'), request.owner);
  }
});
test('old URLs map to backend sorts; unsupported models remain filters, not available choices', () => {
  assert.equal(directorySort('volume'), 'topVolume');
  assert.equal(directorySort('graduation'), 'almostGraduated');
  assert.equal(directorySort('date'), 'newest');
  assert.equal(directorySort('symbol'), 'symbol');
  assert.equal(directorySort('invalid'), 'newest');
  assert.equal(directoryCategory('Bonding Curve'), 'bonding-curve');
  assert.equal(directoryCategory('auction'), 'auction');
  assert.equal(directoryCategory('pre-sale'), 'pre-sale');
  assert.deepEqual(Array.from(exports.categories), ['All', 'Bonding Curve']);
});
