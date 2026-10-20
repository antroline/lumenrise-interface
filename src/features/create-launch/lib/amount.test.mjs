import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const module = { exports: {} };
const output = ts.transpileModule(
  readFileSync(new URL('./amount.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
runInNewContext(output, { module, exports: module.exports });
const { isNumericInput, formatSupply } = module.exports;

test('decimal inputs allow digits, one decimal point, and clearing', () => {
  for (const value of ['', '0', '123', '12.34', '0.', '.', '.5']) {
    assert.equal(isNumericInput(value), true, value);
  }
});

test('numeric inputs only allow whole digits and clearing', () => {
  for (const value of ['', '0', '123']) {
    assert.equal(isNumericInput(value, 'numeric'), true, value);
  }
  for (const value of ['1.5', '.', '-1', '1e3', 'abc']) {
    assert.equal(isNumericInput(value, 'numeric'), false, value);
  }
});

test('typing and pasted values cannot introduce letters or other invalid characters', () => {
  for (const value of ['abc', '12abc', '1e3', '-1', '+1', '1 2', '1\n', '1.2.3', '$12', '۱۲a']) {
    assert.equal(isNumericInput(value), false, JSON.stringify(value));
  }
});

test('thousands formatting preserves decimal input', () => {
  assert.equal(formatSupply('12345.67'), '12,345.67');
  assert.equal(isNumericInput('12,345.67'.replaceAll(',', '')), true);
});
