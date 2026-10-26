import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function confirmation(getTransaction = async () => ({ status: 'SUCCESS' })) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('./confirmation.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(source, {
    module, exports: module.exports, Error, setTimeout, clearTimeout,
    require: name => name === '@/lib/stellar/clients' ? { soroban: { getTransaction } } : require(name),
  });
  return module.exports;
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('a hung RPC lookup stops at ten seconds and its late response cannot restart polling', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolveLookup, lookups = 0, settled = false;
  const c = confirmation(() => {
    lookups++;
    return new Promise(resolve => { resolveLookup = resolve; });
  });
  const waiting = c.confirmTransaction('slow-hash');
  const rejected = assert.rejects(waiting, /within 10 seconds/).then(() => { settled = true; });
  t.mock.timers.tick(9999);
  await flush();
  assert.equal(settled, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(lookups, 1);
  resolveLookup({ status: 'NOT_FOUND' });
  await flush();
  t.mock.timers.tick(10000);
  await flush();
  assert.equal(lookups, 1);
});

test('confirmation retries missing hashes and accepts only SUCCESS', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let lookups = 0;
  const c = confirmation(async () => ({ status: ++lookups < 3 ? 'NOT_FOUND' : 'SUCCESS' }));
  const waiting = c.confirmTransaction('hash');
  await flush();
  t.mock.timers.tick(1000);
  await flush();
  t.mock.timers.tick(1000);
  assert.equal((await waiting).status, 'SUCCESS');
  assert.equal(lookups, 3);
  await assert.rejects(confirmation(async () => ({ status: 'FAILED' })).confirmTransaction('failed'), /failed on-chain/);
});

test('RPC errors end confirmation immediately without retries', async () => {
  let lookups = 0;
  const c = confirmation(async () => { lookups++; throw new Error('RPC unavailable'); });
  await assert.rejects(c.confirmTransaction('hash'), /RPC unavailable/);
  assert.equal(lookups, 1);
});

test('a Blux broadcast timeout returns its hash for one caller-controlled confirmation', async () => {
  let lookups = 0, submissions = 0;
  const c = confirmation(async () => { lookups++; return { status: 'SUCCESS' }; });
  const hash = 'a'.repeat(64), recorded = [];
  const result = await c.recoverSubmittedTransaction(async () => {
    submissions++;
    throw new Error(`BLUX: Timed out waiting for transaction ${hash} to finalize.`);
  }, hash => recorded.push(hash));
  assert.equal(result.hash, hash);
  assert.deepEqual(recorded, [hash]);
  assert.equal(lookups, 0);
  await c.confirmTransaction(result.hash);
  assert.equal(lookups, 1);
  assert.equal(submissions, 1);
});

test('the tenth lookup can still confirm, and ten missing results never report success', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const finalStatus of ['SUCCESS', 'NOT_FOUND']) {
    let lookups = 0;
    const c = confirmation(async () => ({ status: ++lookups === 10 ? finalStatus : 'NOT_FOUND' }));
    const waiting = c.confirmTransaction('hash');
    const result = finalStatus === 'SUCCESS' ? waiting : assert.rejects(waiting, /within 10 seconds/);
    for (let i = 0; i < 9; i++) {
      await flush();
      t.mock.timers.tick(1000);
    }
    await result;
    assert.equal(lookups, 10);
  }
});

test('wallet rejection and submission errors are preserved without confirmation retries', async () => {
  let lookups = 0;
  const c = confirmation(async () => { lookups++; return { status: 'SUCCESS' }; });
  for (const cause of [new Error('User rejected'), new Error('BLUX: Failed to submit transaction'), new Error('BLUX: Timed out waiting for transaction invalid to finalize.')]) {
    await assert.rejects(c.recoverSubmittedTransaction(async () => { throw cause; }, () => assert.fail()), error => error === cause);
  }
  assert.equal(lookups, 0);
});

test('ordinary successful submissions are returned unchanged without another lookup', async () => {
  const c = confirmation(() => assert.fail());
  const submitted = { hash: 'hash' };
  assert.equal(await c.recoverSubmittedTransaction(async () => submitted, () => assert.fail()), submitted);
});

test('a recovered hash that failed on-chain never becomes a successful confirmation', async () => {
  const c = confirmation(async () => ({ status: 'FAILED' }));
  const hash = 'b'.repeat(64);
  const submitted = await c.recoverSubmittedTransaction(async () => {
    throw new Error(`BLUX: Timed out waiting for transaction ${hash} to finalize.`);
  }, () => {});
  await assert.rejects(c.confirmTransaction(submitted.hash), /failed on-chain/);
});
