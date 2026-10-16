import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function load(filename) {
  const path = resolve(directory, filename),
    module = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) =>
      name.startsWith('.')
        ? load(resolve(dirname(path), `${name}.ts`))
        : require(name),
  });
  return module.exports;
}
const details = load('bonding-details.ts');

test('graduation uses net reserves with exact integer arithmetic, including above-target and unavailable targets', () => {
  assert.equal(details.graduationPercent('1000000417', '10000000000'), 10);
  assert.equal(
    details.graduationPercent('999999999999999999', '1000000000000000000'),
    99.99,
  );
  assert.equal(details.graduationPercent('12000000000', '10000000000'), 120);
  assert.equal(details.graduationPercent('0', '10000000000'), 0);
  assert.equal(details.graduationPercent('100', '0'), null);
});

test('allocation percentages describe actual quantities and preserve zero buckets', () => {
  assert.equal(
    details.allocationShare('800000000000000', '1000000000000000'),
    '80%',
  );
  assert.equal(
    details.allocationShare('200000000000000', '1000000000000000'),
    '20%',
  );
  assert.equal(details.allocationShare('0', '1000000000000000'), '0%');
  assert.equal(details.allocationShare('1', '3'), '33.333333%');
  assert.equal(details.allocationShare('0', '0'), '—');
});

test('CTA availability follows contract states, busy state, supply and supported sell-back', () => {
  const b = {
    status: 'Open',
    state: { sold: '10' },
    buckets: { curve: '100' },
  };
  const availability = (status, sold = '10', busy = false) =>
    details.curveAvailability({ ...b, status, state: { sold } }, busy);
  assert.equal(availability('Open').buy, true);
  assert.equal(availability('Open').sell, true);
  assert.equal(availability('Open', '0').sell, false);
  assert.equal(availability('Open', '100').buy, false);
  assert.equal(availability('Failed').buy, false);
  assert.equal(availability('Failed').sell, true);
  for (const status of ['Scheduled', 'Graduated']) {
    assert.equal(availability(status).buy, false);
    assert.equal(availability(status).sell, false);
  }
  assert.equal(availability('Open', '10', true).buy, false);
  assert.equal(details.curveAvailability(b, undefined).sell, false);
  assert.equal(details.curveAvailability(null, false).buy, false);
});

test('missing raw contract data cannot imply a known non-busy state', () => {
  const result = details.indexedContract({ config: {}, state: {} });
  assert.equal(result.config, undefined);
  assert.equal(result.state, undefined);
});

test('display formatting retains stroop precision, date year, and invalid-date states', () => {
  assert.equal(details.detailAmount('9007199254740993'), '900,719,925.4740993');
  assert.equal(details.detailAmount('1000000417'), '100.0000417');
  assert.equal(details.detailAmount(null), 'Unavailable');
  assert.match(details.detailDate('1793046235'), /2026/);
  assert.match(details.detailDate('1793046235'), /UTC$/);
  assert.equal(details.detailDate('999999999999999999'), 'Unavailable');
  assert.equal(details.durationLabel('86400'), '1 day');
  assert.equal(details.durationLabel('0'), 'none');
});
