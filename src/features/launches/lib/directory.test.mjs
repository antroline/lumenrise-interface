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
  { exports },
);
const { selectDirectoryLaunches, directorySort, directoryCategory, directoryPage } = exports;
const launch = (id, overrides = {}) => ({
  network: 'testnet',
  contractId: id,
  pair: 'USDC',
  metadata: { name: id, symbol: id.toUpperCase() },
  bonding: {
    status: 'Open',
    startsAt: '100',
    endsAt: '200',
    progressBps: 3000,
    curve: { graduationTarget: '100000000' },
    state: { buyerCount: 1, quoteReserve: '30000000', graduated: false },
  },
  ...overrides,
});
const choose = (rows, options = {}) =>
  Array.from(
    selectDirectoryLaunches(rows, {
      category: 'All',
      search: '',
      sort: 'newest',
      direction: 'desc',
      markets: new Map(),
      ...options,
    }),
    (l) => l.contractId,
  );

test('category, symbol search and recent trading ranking compose across the dataset', () => {
  const a = launch('alpha'),
    b = launch('beta'),
    c = launch('gamma', { bonding: null });
  b.bonding.state.buyerCount = 10;
  assert.deepEqual(
    choose([a, b, c], {
      category: 'Bonding Curve',
      search: '  BETA ',
      sort: 'trending',
    }),
    ['beta'],
  );
  // Lifetime buyers must not determine recent trending activity.
  const markets = new Map([
    ['alpha', { volume24h: { tradeCount: 5 } }],
    ['beta', { volume24h: { tradeCount: 0 } }],
  ]);
  assert.deepEqual(choose([b, a], { sort: 'trending', markets }), ['alpha', 'beta']);
  assert.deepEqual(choose([a], { category: 'Auction' }), []);
});
test('newest uses launch timestamp rather than end or snapshot time', () => {
  const a = launch('a'),
    b = launch('b');
  b.bonding.startsAt = '150';
  a.bonding.endsAt = '9999';
  assert.deepEqual(choose([a, b]), ['b', 'a']);
  assert.deepEqual(choose([a, b], { direction: 'asc' }), ['a', 'b']);
});
test('almost graduated includes open 100%-filled launches but excludes graduated, failed, scheduled and unknown targets', () => {
  const active = launch('active');
  active.bonding.progressBps = 10000;
  const graduated = launch('graduated');
  graduated.bonding.status = 'Graduated';
  const flag = launch('flag');
  flag.bonding.state.graduated = true;
  const failed = launch('failed');
  failed.bonding.status = 'Failed';
  const scheduled = launch('scheduled');
  scheduled.bonding.status = 'Scheduled';
  const missing = launch('missing');
  missing.bonding.curve.graduationTarget = '0';
  assert.deepEqual(
    choose(
      [graduated, flag, failed, scheduled, missing, active, launch('partial')],
      { sort: 'graduation' },
    ),
    ['active', 'partial'],
  );
});
test('volume ranks exact integers within payment assets, leaving unavailable data last in each group', () => {
  const a = launch('a'),
    b = launch('b'),
    missing = launch('missing'),
    xlm = launch('xlm', { pair: 'XLM' });
  const markets = new Map([
    ['a', { volume24h: { grossPairAmount: '9007199254740993' } }],
    ['b', { volume24h: { grossPairAmount: '9007199254740994' } }],
    ['xlm', { volume24h: { grossPairAmount: '999999999999999999' } }],
  ]);
  assert.deepEqual(choose([xlm, missing, a, b], { sort: 'volume', markets }), [
    'b',
    'a',
    'missing',
    'xlm',
  ]);
  assert.deepEqual(
    choose([missing, a, b], { sort: 'volume', direction: 'asc', markets }),
    ['a', 'b', 'missing'],
  );
});
test('empty search results, stable ties, duplicate rows and URL fallbacks are handled', () => {
  const a = launch('a'),
    b = launch('b');
  assert.deepEqual(choose([b, a, a]), ['a', 'b']);
  assert.deepEqual(choose([a], { search: 'absent' }), []);
  assert.equal(directorySort('unsupported'), 'newest');
  assert.equal(directoryCategory('pre-sale'), 'Presale');
});

test('filtering and sorting happen before 20-row pagination', () => {
  const rows = Array.from({ length: 45 }, (_, i) => {
    const row = launch(`project${i}`);
    row.bonding.startsAt = String(100 + i);
    row.metadata.symbol = i % 2 ? 'ODD' : 'EVEN';
    return row;
  });
  const sorted = choose(rows, { search: 'EVEN' });
  assert.equal(sorted.length, 23);
  assert.equal(sorted[0], 'project44');
  const { page, pageCount, offset } = directoryPage(sorted.length, 2);
  assert.equal(page, 2);
  assert.equal(pageCount, 2);
  assert.deepEqual(sorted.slice(offset, offset + 20), ['project4', 'project2', 'project0']);
  assert.deepEqual(choose(rows, { search: 'project0' }), ['project0']);
  assert.equal(directoryPage(45, 999).page, 3);
  assert.equal(directoryPage(45, -2).page, 1);
  assert.equal(directoryPage(0, Infinity).page, 1);
});

test('all column sorts reverse numeric values, keep unavailable last and do not mutate input', () => {
  const a = launch('a'), b = launch('b'), missing = launch('missing', { bonding: null });
  a.bonding.state.buyerCount = 9;
  b.bonding.state.buyerCount = 10;
  a.bonding.state.quoteReserve = '9007199254740993';
  b.bonding.state.quoteReserve = '9007199254740994';
  a.bonding.progressBps = 20;
  b.bonding.progressBps = 100;
  b.bonding.startsAt = '200';
  const rows = [missing, a, b];
  for (const sort of ['participants', 'figure', 'phase', 'date']) {
    assert.deepEqual(choose(rows, { sort }), ['b', 'a', 'missing']);
    assert.deepEqual(choose(rows, { sort, direction: 'asc' }), ['a', 'b', 'missing']);
  }
  assert.deepEqual(choose(rows, { sort: 'name' }), ['missing', 'b', 'a']);
  assert.deepEqual(choose(rows, { sort: 'name', direction: 'asc' }), ['a', 'b', 'missing']);
  assert.deepEqual(choose(rows, { sort: 'category', direction: 'asc' }), ['a', 'b', 'missing']);
  assert.deepEqual(rows.map((l) => l.contractId), ['missing', 'a', 'b']);
});
