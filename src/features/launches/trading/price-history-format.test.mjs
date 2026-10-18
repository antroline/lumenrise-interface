import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./price-history-format.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helpers = {};
new Function('exports', compiled)(helpers);
const { formatPriceAxis, formatExactPrice, priceDomain, formatPriceTime } = helpers;

test('small price labels stay nonzero and use decimal notation', () => {
  assert.equal(formatPriceAxis(0.0000022), '0.0000022');
  assert.equal(formatPriceAxis(1e-24), '0.000000000000000000000001');
  assert.equal(formatPriceAxis(0), '0');
  assert.equal(formatPriceAxis(1234.56), '1,234.56');
});

test('tooltip preserves indexed integer precision and scale', () => {
  assert.equal(formatExactPrice('2200000000001', 18), '0.000002200000000001');
  assert.equal(formatExactPrice('22000000', 7), '2.2');
  assert.equal(formatExactPrice('7', 0), '7');
  assert.equal(formatExactPrice('0', 7), '0');
});

test('flat, zero and very small domains remain finite without fixed decimal padding', () => {
  assert.deepEqual(priceDomain([2, 2]), [1.96, 2.04]);
  assert.deepEqual(priceDomain([0, 0]), [0, 1]);
  const prices = [1e-18, 2e-18];
  const before = [...prices];
  const [low, high] = priceDomain(prices);
  assert.ok(low >= 0 && low < prices[0]);
  assert.ok(high > prices[1] && high < 3e-18);
  assert.deepEqual(prices, before);
});

test('axis timestamps use UTC consistently across timeframe sizes', () => {
  const time = Date.parse('2026-10-18T14:05:00Z');
  assert.equal(formatPriceTime(time, true), '14:05');
  assert.equal(formatPriceTime(time, false), 'Oct 18');
});
