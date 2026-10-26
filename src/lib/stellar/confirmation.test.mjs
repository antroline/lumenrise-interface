import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import ts from 'typescript';

const hash = '73a66b6ee00fc1b428502c906b9b8b6c4eae84625b6d72c773cc1f1a8b8199ec';
const timeout = () => new Error(`BLUX: Timed out waiting for transaction ${hash} to finalize.`);
const code = ts.transpileModule(readFileSync(new URL('./confirmation.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load(responses) {
  const module = { exports: {} }, delays = [], lookups = [];
  runInNewContext(code, {
    module, exports: module.exports, Error,
    setTimeout: (resolve, delay) => { delays.push(delay); resolve(); },
    require: name => name === '@stellar/stellar-sdk' ? { scValToNative } : {
      soroban: { getTransaction: async id => {
        lookups.push(id);
        const result = responses[Math.min(lookups.length - 1, responses.length - 1)];
        if (result instanceof Error) throw result;
        return result;
      } },
    },
  });
  return { ...module.exports, delays, lookups };
}

test('confirmation stops at the first SUCCESS, including the tenth lookup', async () => {
  for (const attempt of [1, 3, 10]) {
    const h = load([...Array(attempt - 1).fill({ status: 'NOT_FOUND' }), { status: 'SUCCESS' }]);
    assert.equal((await h.confirmTransaction(hash)).status, 'SUCCESS');
    assert.deepEqual(h.lookups, Array(attempt).fill(hash));
    assert.deepEqual(h.delays, Array(attempt - 1).fill(1000));
  }
});

test('ten NOT_FOUND results time out without treating the hash as confirmed', async () => {
  const h = load([{ status: 'NOT_FOUND' }]);
  await assert.rejects(h.confirmTransaction(hash), /still pending/);
  assert.equal(h.lookups.length, 10);
  assert.deepEqual(h.delays, Array(9).fill(1000));
});

test('FAILED stops immediately and never advances as success', async () => {
  const h = load([{ status: 'FAILED' }]);
  await assert.rejects(h.confirmTransaction(hash), /failed on-chain/);
  assert.equal(h.lookups.length, 1);
  assert.equal(h.delays.length, 0);
});

test('Blux timeout recovery preserves the hash before checking and never resubmits', async () => {
  const h = load([{ status: 'NOT_FOUND' }, { status: 'SUCCESS', returnValue: nativeToScVal('curve-address') }]);
  let submissions = 0;
  const result = await h.recoverSubmittedTransaction(async () => { submissions++; throw timeout(); }, id => {
    assert.equal(id, hash);
    assert.equal(h.lookups.length, 0);
  });
  assert.equal(submissions, 1);
  assert.equal(result.hash, hash);
  assert.equal(await result.returnValue(), 'curve-address');
  assert.equal(h.lookups.length, 2);
});

test('unresolved Blux timeout keeps its hash and fails after ten checks', async () => {
  const h = load([{ status: 'NOT_FOUND' }]);
  let saved;
  await assert.rejects(h.recoverSubmittedTransaction(async () => { throw timeout(); }, id => { saved = id; }), /still pending/);
  assert.equal(saved, hash);
  assert.equal(h.lookups.length, 10);
});

test('a recovered on-chain failure is never reported as success', async () => {
  const h = load([{ status: 'FAILED' }]);
  await assert.rejects(h.recoverSubmittedTransaction(async () => { throw timeout(); }, () => {}), /failed on-chain/);
  assert.equal(h.lookups.length, 1);
});

test('wallet rejection and submission errors are preserved without confirmation retries', async () => {
  for (const cause of [new Error('User rejected'), new Error('BLUX: Failed to submit transaction'), new Error('BLUX: Timed out waiting for transaction invalid to finalize.')]) {
    const h = load([]);
    await assert.rejects(h.recoverSubmittedTransaction(async () => { throw cause; }, () => assert.fail()), error => error === cause);
    assert.equal(h.lookups.length, 0);
  }
});

test('ordinary successful submissions are returned unchanged', async () => {
  const h = load([]), submitted = { hash };
  assert.equal(await h.recoverSubmittedTransaction(async () => submitted, () => assert.fail()), submitted);
  assert.equal(h.lookups.length, 0);
});
