import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('./home-discovery.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports });
const { discoverLaunches, canParticipate, progressLabel, launchStatus } = exports;
const launch = (id, progressBps, status = 'Open', createdAt = null, extra = {}) => ({
  contractId: id, createdAt,
  bonding: { status, progressBps, state: { sold: '1', graduated: false }, buckets: { curve: '100' }, ...extra },
});

test('ranks active curves by exact progress, excludes confirmed graduations, and deduplicates', () => {
  const rows = [launch('low', 1078), launch('high', 1174), launch('done', 10000, 'Graduated'), launch('scheduled', 0, 'Scheduled'), launch('flagged', 9999, 'Open', null, { state: { graduated: true } })];
  const result = discoverLaunches([...rows, rows[0], { contractId: 'unknown', bonding: null }]);
  assert.equal(result.launches.length, 5);
  assert.equal(result.open.map((l) => l.contractId).join(','), 'high,low');
  assert.equal(result.featured.contractId, 'high');
  assert.equal(rows[0].contractId, 'low');
});

test('filled capacity does not imply graduation or allow participation', () => {
  const filled = launch('filled', 10000);
  const available = launch('available', 9999);
  assert.equal(canParticipate(filled), false);
  assert.equal(discoverLaunches([filled, available]).open.length, 2);
  assert.equal(discoverLaunches([filled, available]).featured.contractId, 'available');
  for (const status of ['Scheduled', 'Graduated', 'Failed']) assert.equal(canParticipate(launch(status, 1000, status)), false);
  assert.equal(canParticipate(launch('sold-out', 9999, 'Open', null, { state: { sold: '100', graduated: false } })), false);
  assert.equal(canParticipate(launch('big', 1000, 'Open', null, { state: { sold: '900719925474099300', graduated: false }, buckets: { curve: '900719925474099301' } })), true);
});

test('status separates filled capacity from confirmed graduation', () => {
  assert.equal(launchStatus(launch('a', 9999)), 'Open');
  assert.equal(launchStatus(launch('b', 10000)), 'Filled');
  assert.equal(launchStatus(launch('c', 10000, 'Open', null, { state: { sold: '1', graduated: true } })), 'Graduated');
  assert.equal(launchStatus(launch('d', 0, 'Scheduled')), 'Scheduled');
  assert.equal(launchStatus(launch('e', 400, 'Failed')), 'Failed');
});

test('recency uses verified creation only, omitting missing or invalid timestamps', () => {
  const result = discoverLaunches([
    launch('old', 0, 'Open', '2026-10-01T01:00:00Z', { startsAt: '9999999999' }),
    launch('missing', 0), launch('invalid', 0, 'Open', 'invalid'),
    launch('new', 0, 'Graduated', '2026-10-19T02:00:00Z'),
    launch('middle', 0, 'Scheduled', '2026-10-10T02:00:00Z'),
  ]);
  assert.equal(result.recent.map((l) => l.contractId).join(','), 'new,middle,old');
});

test('percentages preserve all basis point precision including near graduation', () => {
  assert.equal(progressLabel(1174), '11.74%');
  assert.equal(progressLabel(9999), '99.99%');
  assert.equal(progressLabel(1), '0.01%');
  assert.equal(progressLabel(10000), '100%');
  assert.equal(discoverLaunches([]).featured, undefined);
});
