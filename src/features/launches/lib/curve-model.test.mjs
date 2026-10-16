import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const unit = 10_000_000n;
const module = { exports: {} };
const source = ts.transpileModule(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), 'curve-model.ts'),
    'utf8',
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
runInNewContext(source, {
  module,
  exports: module.exports,
  require: (name) => {
    assert.equal(name, '../bonding/contract');
    return { UNIT: unit };
  },
});
const model = module.exports;
const config = {
  base: 240_000_000n * unit,
  quote: 240_000_000n * unit,
  capacity: 80_000_000n * unit,
  sold: 100n * unit,
  target: 1000n * unit,
};

test('visual model matches the observed Macina contract price and reserve rounding', () => {
  assert.equal(
    model.modelPrice(config.base, config.quote, config.sold),
    10_000_009n,
  );
  assert.equal(
    model.modelReserves(config.base, config.quote, config.sold),
    1_000_000_417n,
  );
  assert.equal(model.modelPrice(config.base, config.quote, 0n), unit);
});

test('the target estimate is the first stroop whose cumulative reserve meets the target', () => {
  const result = model.curveModel(config);
  assert.ok(result.graduation > config.sold);
  assert.ok(
    model.modelReserves(config.base, config.quote, result.graduation) >=
      config.target,
  );
  assert.ok(
    model.modelReserves(config.base, config.quote, result.graduation - 1n) <
      config.target,
  );
  assert.ok(result.end > result.graduation);
  assert.ok(result.end <= config.capacity);
});

test('samples remain ordered and bounded even at the end of the actual allocation', () => {
  const result = model.curveModel({ ...config, sold: config.capacity });
  assert.equal(result.end, config.capacity);
  assert.equal(result.points[0].sold, 0n);
  assert.equal(result.points.at(-1).sold, config.capacity);
  for (let i = 1; i < result.points.length; i++) {
    assert.ok(result.points[i].sold >= result.points[i - 1].sold);
    assert.ok(result.points[i].price >= result.points[i - 1].price);
  }
});

test('invalid or unavailable curve parameters do not produce invented chart data', () => {
  for (const change of [
    { base: config.capacity },
    { capacity: 0n },
    { quote: 0n },
    { sold: -1n },
    { sold: config.capacity + 1n },
    { target: 0n },
  ])
    assert.equal(model.curveModel({ ...config, ...change }), null);
  assert.equal(
    model.curveModel({ ...config, target: 999_999_999n * unit }).graduation,
    null,
  );
});

test('SVG normalization does not cast large raw amounts to floating point', () => {
  const maximum = 9_223_372_036_854_775_807n;
  assert.equal(model.plotRatio(maximum, 0n, maximum), 1);
  assert.equal(model.plotRatio(0n, 0n, maximum), 0);
  assert.equal(model.plotRatio(maximum / 2n, 0n, maximum), 0.499999);
});
