import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { Asset, Keypair, Networks, nativeToScVal } from '@stellar/stellar-sdk';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const owner = Keypair.random().publicKey();
const issuer = Keypair.random().publicKey();
const curve = new Asset('CURVE', issuer).contractId(Networks.TESTNET);

// Execute the actual TypeScript with wallet/network boundaries replaced.
// No signatures or live transactions are submitted by these tests.
function loadSource(filename, mocks = { '@bluxcc/react': {} }, globals = {}, cache = new Map()) {
  const path = resolve(directory, filename);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, Date, Error,
    require: (name) => name in mocks ? mocks[name] : name.startsWith('.')
      ? loadSource(resolve(dirname(path), `${name}.ts`), mocks, globals, cache)
      : require(name),
    ...globals,
  }, { filename: path });
  return module.exports;
}

const { initialLaunchDraft } = loadSource('launch-draft.ts');
const { buildBondingCurveParams, FACTORY_CONTRACT_ID, isBondingDraft } = loadSource('bonding-curve.ts');
function draft() {
  return {
    ...structuredClone(initialLaunchDraft),
    method: 'bonding', methodSelected: true,
    name: 'Test token', symbol: 'TIDE', description: 'Entered description', logo: 'data:image/png;base64,abc',
    supply: '900719925.4740993', quote: 'USDC',
    allocation: { saleShare: '40.01', poolShare: '29.99', teamShare: '30', cliffMonths: '2', vestingMonths: '6' },
    bonding: { target: '1234.5678901', creatorFee: true, startsAt: '', endsAt: '', durationDays: '30' },
  };
}

test('maps exact amounts, pair, allocations, team vesting, fee toggle, and chosen duration', () => {
  const params = buildBondingCurveParams(draft(), owner, issuer, 1_800_000_000);
  assert.equal(params.owner, owner);
  assert.equal(params.asset, new Asset('TIDE', issuer).contractId(Networks.TESTNET));
  assert.equal(params.pair, 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
  assert.equal(params.metadata.symbol, 'TIDE');
  assert.equal(params.metadata.description, 'Entered description');
  assert.equal(params.metadata.logo, 'https://example.com/logo.png');
  assert.equal(params.allocations.curve_bps, 4001);
  assert.equal(params.allocations.pool_bps, 2999);
  assert.equal(params.allocations.team_bps, 3000);
  assert.equal(params.vesting.cliff_seconds, '5184000');
  assert.equal(params.vesting.duration_seconds, '15552000');
  assert.equal(params.vesting.schedule.tag, 'Weekly');
  assert.equal(params.curve.graduation_target, '12345678901');
  const inventory = (9007199254740993n * 4001n) / 10000n;
  assert.equal(params.curve.virtual_base_reserve, String(inventory * 3n));
  assert.equal(params.curve.virtual_quote_reserve, String(inventory * 3n));
  assert.equal(params.curve.creator_fee_bps, 10);
  assert.ok(params.curve.creator_payout_bps + 100 <= 10000);
  assert.equal(params.starts_at, '1800000060');
  assert.equal(params.ends_at, '1802592060');
});

test('maps XLM, custom dates, and a disabled creator fee', () => {
  const form = draft();
  form.quote = 'XLM';
  form.bonding.creatorFee = false;
  form.bonding.startsAt = '2030-01-02T07:00:00+03:00';
  form.bonding.endsAt = '2030-02-02T07:00:00+03:00';
  const params = buildBondingCurveParams(form, owner, issuer, 1_800_000_000);
  assert.equal(params.pair, 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC');
  assert.equal(params.starts_at, String(Date.parse('2030-01-02T04:00:00Z') / 1000));
  assert.equal(params.ends_at, String(Date.parse('2030-02-02T04:00:00Z') / 1000));
  assert.equal(params.curve.creator_fee_bps, 0);
});

test('rejects unsupported methods and invalid contract inputs before signing', () => {
  const invalid = [
    (f) => { f.method = 'fixed'; },
    (f) => { f.method = 'auction'; },
    (f) => { f.allocation.poolShare = '0'; f.allocation.saleShare = '70'; },
    (f) => { f.allocation.saleShare = '0'; f.allocation.poolShare = '70'; },
    (f) => { f.allocation.teamShare = '29.99'; },
    (f) => { f.supply = '0.00000001'; },
    (f) => { f.bonding.target = '1.00000001'; },
    (f) => { f.allocation.vestingMonths = '0'; },
    (f) => { f.allocation.cliffMonths = '100000000000000000000'; },
    (f) => { f.bonding.startsAt = '2000-01-01T00:00:00Z'; },
    (f) => { f.bonding.endsAt = '2000-01-01T00:00:00Z'; },
  ];
  for (const change of invalid) {
    const form = draft();
    change(form);
    assert.throws(() => buildBondingCurveParams(form, owner, issuer, 1_800_000_000));
  }
  assert.ok(isBondingDraft(draft()));
  assert.equal(isBondingDraft({ method: 'bonding' }), false);
});

function harness({ signedIn = true, rejectLogin = false, rejectSetup = false, rejectSac = false, rejectReturn = false, factoryStatus = 'NOT_FOUND', balance, returnWait } = {}) {
  const storage = new Map();
  const messages = [];
  const calls = [];
  const sends = [];
  const confirmed = new Set();
  const progress = [];
  const issuedTokens = new Map();
  let transactionCount = 0;
  let factoryCalls = 0;
  const store = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const state = loadSource('launch-state.ts');
  const transactions = loadSource('transactions.ts');
  const makeTransaction = (kind) => {
    const xdr = `${kind}:${++transactionCount}`;
    return { toXDR: () => xdr, hash: () => Buffer.from(xdr) };
  };
  const exports = loadSource('use-bonding-launch.ts', {
    react: {
      useState: (value) => {
        let current = value;
        return [value, (next) => {
          current = typeof next === 'function' ? next(current) : next;
          if (current && typeof current === 'object' && 'status' in current)
            progress.push(structuredClone(current));
        }];
      },
      useRef: (value) => ({ current: value }),
    },
    '@bluxcc/react': {
      useBlux: () => ({ user: signedIn ? { address: owner } : null, isReady: true,
        sendTransaction: async (xdr, options) => {
          sends.push({ xdr, options });
          if (xdr.startsWith('setup:') && rejectSetup) { rejectSetup = false; throw new Error('Rejected setup signature'); }
          if (xdr.startsWith('sac:') && rejectSac) { rejectSac = false; throw new Error('Rejected SAC signature'); }
          confirmed.add(xdr);
          return { hash: xdr };
        },
      }),
      useWriteContract: () => ({ mutateAsync: async (call) => {
        factoryCalls++;
        calls.push(call);
        return { hash: `factory-${factoryCalls}`, returnValue: async () => { await returnWait; if (rejectReturn) throw new Error('Result temporarily unavailable'); return curve; } };
      } }),
    },
    '@/lib/launchpad': { useLaunchpad: () => ({
      notify: (message) => messages.push(message),
      login: async (path) => {
        calls.push(path);
        if (rejectLogin) throw new Error('Login unavailable');
      },
    }) },
    './launch-state': {
      ...state,
      isTransactionConfirmed: async (hash) => confirmed.has(hash),
      checkPending: async (token) => confirmed.has(token.sacHash) ? { ...token, stage: 'sacConfirmed', sacXdr: undefined } : token,
    },
    './transactions': {
      ...transactions,
      horizon: { loadAccount: async () => ({ balances: [...issuedTokens.values()].map((token) => ({ ...token, balance: balance ?? token.balance })) }) },
      soroban: { getTransaction: async () => ({ status: factoryStatus, returnValue: factoryStatus === 'SUCCESS' ? nativeToScVal(curve) : undefined }) },
      buildSetup: () => makeTransaction('setup'),
      buildIssuance: (_account, secret, _owner, code, amount) => {
        const address = Keypair.fromSecret(secret).publicKey();
        issuedTokens.set(address, { asset_code: code, asset_issuer: address, balance: amount });
        return makeTransaction('issuance');
      },
      submitIssuance: async (xdr) => confirmed.add(xdr),
      buildSacDeployment: async () => makeTransaction('sac'),
      transactionHash: (transaction) => transaction.toXDR(),
    },
  }, { localStorage: store, sessionStorage: store });
  return { flow: exports.useBondingLaunch(), storage, calls, sends, messages, progress, factoryCalls: () => factoryCalls };
}

function savedRecords(h) {
  return [...h.storage.entries()]
    .filter(([key]) => key.startsWith('launchpad:testnet-bonding:'))
    .map(([, value]) => JSON.parse(value));
}

test('only bonding reaches the factory, with one object argument and explicit testnet', async () => {
  const h = harness();
  await h.flow.launch({ ...draft(), method: 'fixed' });
  await h.flow.launch({ ...draft(), method: 'auction' });
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.calls[0].call.address, FACTORY_CONTRACT_ID);
  assert.equal(h.calls[0].call.fn, 'create_bonding_curve');
  assert.equal(h.calls[0].call.args.length, 1);
  assert.equal(typeof h.calls[0].call.args[0], 'object');
  assert.equal(h.calls[0].options.network, Networks.TESTNET);
  assert.ok(h.sends.every((send) => send.options.network === Networks.TESTNET));
  const saved = savedRecords(h)[0];
  assert.equal(saved.curveAddress, curve);
  assert.equal(saved.token.issuerSecret, undefined);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  await h.flow.launch({ ...draft(), name: 'Another token' });
  assert.equal(h.factoryCalls(), 2);
});

test('rejected SAC approval resumes the same issued token without another setup', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.progress.at(-1).step, 'deploy');
  assert.equal(h.progress.at(-1).phase, 'working');
  const retryStart = h.progress.length;
  await h.flow.launch(draft());
  assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 1);
  assert.equal(h.factoryCalls(), 1);
  assert.deepEqual([...new Set(h.progress.slice(retryStart).map((event) => event.step))], ['check', 'deploy', 'curve']);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('a submitted factory transaction is not duplicated when its result is unavailable', async () => {
  const h = harness({ rejectReturn: true });
  await h.flow.launch(draft());
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.match(h.progress.at(-1).message, /still pending/);
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.progress.at(-1).hash, 'factory-1');
  assert.equal(h.progress.some((event) => event.status === 'success'), false);
});

test('missing full supply prevents the factory transfer; signed-out launches preserve the entered form', async () => {
  const h = harness({ balance: '1' });
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 0);
  assert.match(h.progress.at(-1).message, /full token supply/);
  const signedOut = harness({ signedIn: false });
  await signedOut.flow.launch(draft());
  assert.equal(signedOut.factoryCalls(), 0);
  assert.equal(signedOut.sends.length, 0);
  assert.equal(signedOut.progress.length, 0);
  assert.deepEqual(JSON.parse(signedOut.storage.get('launchpad:bonding-auth-return')), draft());
});

test('progress follows actual stages and wallet approvals, then completes with a confirmed curve address', async () => {
  const h = harness();
  await h.flow.launch(draft());
  assert.deepEqual([...new Set(h.progress.map((event) => event.step))], ['check', 'setup', 'issue', 'deploy', 'curve']);
  assert.deepEqual(h.progress.filter((event) => event.phase === 'approval').map((event) => event.step), ['setup', 'deploy', 'curve']);
  const result = h.progress.at(-1);
  assert.equal(result.status, 'success');
  assert.equal(result.curveAddress, curve);
  assert.equal(result.hash, 'factory-1');
  assert.equal(h.messages.length, 0);
});

test('launch errors and recovered results stay in the operation dialog without duplicate toasts', async () => {
  const h = harness({ rejectReturn: true, factoryStatus: 'SUCCESS' });
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.messages.length, 0);
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.messages.length, 0);
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.messages.length, 0);
});

test('signed-out failures still show feedback when there is no operation dialog', async () => {
  const h = harness({ signedIn: false, rejectLogin: true });
  await h.flow.launch(draft());
  assert.equal(h.progress.length, 0);
  assert.deepEqual(h.messages, ['Login unavailable']);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.sends.length, 0);
});

test('a submitted launch stays running until its result is confirmed and ignores duplicate clicks', async () => {
  let release;
  const returnWait = new Promise((resolve) => { release = resolve; });
  const h = harness({ returnWait });
  const launch = h.flow.launch(draft());
  // Let the asynchronous setup/issuance/deployment reach the deferred factory result.
  for (let attempt = 0; attempt < 100 && !h.progress.some((event) => event.hash === 'factory-1'); attempt++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.progress.at(-1).hash, 'factory-1');
  assert.equal(h.progress.at(-1).status, 'running');
  assert.equal(h.progress.at(-1).phase, 'confirming');
  assert.equal(h.progress.some((event) => event.status === 'success'), false);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  release();
  await launch;
  assert.equal(h.progress.at(-1).status, 'success');
});

test('retry recovers a confirmed factory result without signing again', async () => {
  const h = harness({ rejectReturn: true, factoryStatus: 'SUCCESS' });
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'error');
  const sendCount = h.sends.length;
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.sends.length, sendCount);
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.progress.at(-1).curveAddress, curve);
});

test('invalid launch settings stop at validation before any wallet transaction', async () => {
  const h = harness();
  await h.flow.launch({ ...draft(), supply: '0' });
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.progress.at(-1).step, 'check');
  assert.equal(h.progress.at(-1).status, 'error');
});

test('an unfinished token does not block a new name, symbol, or supply, and each can resume separately', async () => {
  const changes = [
    { name: 'Another token' },
    { symbol: 'MOON' },
    { supply: '1000' },
  ];
  for (const change of changes) {
    const h = harness({ rejectSac: true });
    await h.flow.launch(draft());
    const previous = savedRecords(h)[0];
    await h.flow.launch({ ...draft(), ...change });
    assert.equal(h.progress.at(-1).status, 'success');
    assert.equal(h.factoryCalls(), 1);
    assert.equal(savedRecords(h).length, 2);
    assert.deepEqual(savedRecords(h).find((record) => record.token.issuer === previous.token.issuer), previous);
    await h.flow.launch(draft());
    assert.equal(h.progress.at(-1).status, 'success');
    assert.equal(h.factoryCalls(), 2);
    assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 2);
  }
});

test('equivalent decimal supplies reuse the pending and completed token instead of issuing again', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch({ ...draft(), supply: '1000' });
  const issuerBefore = savedRecords(h)[0].token.issuer;
  await h.flow.launch({ ...draft(), supply: '1000.0' });
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.factoryCalls(), 1);
  assert.equal(savedRecords(h).length, 1);
  assert.equal(savedRecords(h)[0].token.issuer, issuerBefore);
  await h.flow.launch({ ...draft(), supply: '001000.0000000' });
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 1);
});

test('an unrelated legacy wallet record is preserved and migrates when its original token is resumed', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch(draft());
  const previous = savedRecords(h)[0];
  const legacyKey = `launchpad:testnet-bonding:${owner}`;
  h.storage.clear();
  h.storage.set(legacyKey, JSON.stringify(previous));
  await h.flow.launch({ ...draft(), name: 'New project' });
  assert.equal(h.progress.at(-1).status, 'success');
  assert.deepEqual(JSON.parse(h.storage.get(legacyKey)), previous);
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.storage.has(legacyKey), false);
  const restored = savedRecords(h).find((record) => record.token.issuer === previous.token.issuer);
  assert.equal(restored.token.setupHash, previous.token.setupHash);
  assert.equal(restored.token.distributionHash, previous.token.distributionHash);
  assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 2);
});

test('a different draft does not recover or overwrite another token factory transaction', async () => {
  const h = harness({ rejectReturn: true });
  await h.flow.launch(draft());
  const previous = savedRecords(h)[0];
  assert.equal(previous.factoryHash, 'factory-1');
  await h.flow.launch({ ...draft(), name: 'New project' });
  assert.equal(h.factoryCalls(), 2);
  assert.equal(savedRecords(h).length, 2);
  assert.deepEqual(savedRecords(h).find((record) => record.token.issuer === previous.token.issuer), previous);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 2);
  assert.match(h.progress.at(-1).message, /still pending/);
  assert.equal(h.progress.at(-1).hash, 'factory-1');
});

test('legacy migration keeps the temporary issuer key and resumes the same setup transaction', async () => {
  const h = harness({ rejectSetup: true });
  await h.flow.launch(draft());
  const previous = savedRecords(h)[0];
  assert.equal(previous.token.stage, 'setupPending');
  assert.equal(typeof previous.token.issuerSecret, 'string');
  h.storage.clear();
  h.storage.set(`launchpad:testnet-bonding:${owner}`, JSON.stringify(previous));
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(savedRecords(h)[0].token.issuer, previous.token.issuer);
  assert.equal(h.sends[0].xdr, h.sends[1].xdr);
  assert.equal(savedRecords(h)[0].token.issuerSecret, undefined);
  assert.equal(h.factoryCalls(), 1);
});
