import { configurationModule, networkModule } from '../../../configuration-fixture.mjs';
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
const IMAGE_URL = 'https://files.example.com/tokens/testnet/logo.png';

// Mirrors the API client's error type so the launch flow can branch on codes.
class ApiError extends Error {
  constructor(message, code, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status;
    this.result = options.result;
    this.serverMessage = options.serverMessage ?? null;
  }
}

// Execute the actual TypeScript with wallet/network boundaries replaced.
// No signatures, image uploads, or live transactions are submitted by these tests.
function loadSource(filename, mocks = { '@bluxcc/react': {} }, globals = {}, cache = new Map()) {
  const path = resolve(directory, filename);
  if (path.replaceAll('\\', '/').endsWith('/lib/api/config.ts')) return configurationModule;
  if (path.replaceAll('\\', '/').endsWith('/lib/stellar/network.ts')) return mocks['@/lib/stellar/network'] ?? networkModule;
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, URLSearchParams, Date, Error, setTimeout: resolve => resolve(),
    URL,
    require: (name) => name === '@/lib/api/config' ? configurationModule : name in mocks ? mocks[name] : name === '@/lib/stellar/clients' ? loadSource('../../../lib/stellar/clients.ts', mocks, globals, cache) : name === '@/lib/stellar/network' ? networkModule : name.startsWith('.')
      ? loadSource(resolve(dirname(path), `${name}.ts`), mocks, globals, cache)
      : require(name),
    ...globals,
  }, { filename: path });
  return module.exports;
}

const { initialLaunchDraft } = loadSource('launch-draft.ts');
const { calculateDraftLaunch } = loadSource('calculate-launch.ts');
const { buildBondingCurveParams, FACTORY_CONTRACT_ID, isBondingDraft } = loadSource('bonding-curve.ts');
function draft() {
  return {
    ...structuredClone(initialLaunchDraft),
    method: 'bonding', methodSelected: true,
    name: 'Test token', symbol: 'TIDE', description: 'Entered description', logo: 'data:image/png;base64,abc',
    supply: '900719925.4740993', quote: 'USDC',
    allocation: { saleShare: '40.01', poolShare: '29.99', teamShare: '30', cliffMonths: '2', vestingMonths: '6' },
    bonding: { creatorPayout: '1234.5678901', creatorFee: '0.1', startsAt: '', endsAt: '', durationDays: '30' },
  };
}

test('maps exact amounts, pair, allocations, team vesting, and percentage fee without an expiry', () => {
  const params = buildBondingCurveParams(draft(), owner, issuer, IMAGE_URL, 1_800_000_000);
  assert.equal(params.owner, owner);
  assert.equal(params.asset, new Asset('TIDE', issuer).contractId(Networks.TESTNET));
  assert.equal(params.pair, 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
  assert.equal(params.metadata.symbol, 'TIDE');
  assert.equal(params.metadata.description, params.metadata.name);
  assert.equal(params.metadata.logo, IMAGE_URL);
  const calculation = calculateDraftLaunch(draft());
  assert.equal(params.allocations.curve_bps, calculation.allocations.curve_bps);
  assert.equal(params.allocations.pool_bps, calculation.allocations.pool_bps);
  assert.equal(params.allocations.team_bps, 3000);
  assert.equal(params.vesting.cliff_seconds, '5184000');
  assert.equal(params.vesting.duration_seconds, '15552000');
  assert.equal(params.vesting.schedule.tag, 'Weekly');
  assert.equal(params.curve.graduation_target, calculation.contract.graduation_target);
  assert.equal(params.curve.virtual_base_reserve, calculation.contract.virtual_base_reserve);
  assert.equal(params.curve.virtual_quote_reserve, calculation.contract.virtual_quote_reserve);
  assert.equal(params.curve.creator_payout_bps, calculation.creatorPayoutBps);
  assert.equal(params.curve.creator_fee_bps, 10);
  assert.ok(params.curve.creator_payout_bps + 100 <= 10000);
  assert.equal(params.starts_at, '1800000060');
  assert.equal(params.reputation_label, '0');
  assert.equal(Object.hasOwn(params, 'ends_at'), false);
});

test('maps custom dates and a disabled creator fee; rejects XLM until conversion exists', () => {
  const form = draft();
  form.quote = 'XLM';
  assert.throws(() => buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000), /USDC only/);
  form.quote = 'USDC';
  form.bonding.creatorFee = '0';
  form.bonding.startsAt = '2030-01-02T07:00:00+03:00';
  form.bonding.endsAt = '2030-02-02T07:00:00+03:00';
  const params = buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000);
  assert.equal(params.pair, 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
  assert.equal(params.starts_at, String(Date.parse('2030-01-02T04:00:00Z') / 1000));
  assert.equal(Object.hasOwn(params, 'ends_at'), false);
  assert.equal(params.curve.creator_fee_bps, 0);
});

test('unconfigured team vesting stays zero from defaults through validation and contract mapping', () => {
  const form = draft();
  form.allocation.cliffMonths = initialLaunchDraft.allocation.cliffMonths;
  form.allocation.vestingMonths = initialLaunchDraft.allocation.vestingMonths;
  assert.equal(form.allocation.cliffMonths, '0');
  assert.equal(form.allocation.vestingMonths, '0');
  const { validateLaunchStep } = loadSource('launch-validation.ts');
  assert.equal(validateLaunchStep(form, 'allocation')['team-cliff'], undefined);
  assert.equal(validateLaunchStep(form, 'allocation')['team-vesting'], undefined);
  const params = buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000);
  assert.equal(params.vesting.cliff_seconds, '0');
  assert.equal(params.vesting.duration_seconds, '0');
});

test('enabled launch scheduling requires a date; disabled scheduling ignores and retains the saved date', () => {
  const form = draft();
  const { validateLaunchStep } = loadSource('launch-validation.ts');
  const { isLaunchScheduled } = loadSource('launch-draft.ts');
  assert.equal(isLaunchScheduled(initialLaunchDraft.bonding), false);
  form.bonding.scheduleEnabled = true;
  form.bonding.startsAt = '';
  assert.equal(validateLaunchStep(form, 'settings')['bonding-start'], 'Choose a launch date and time.');
  assert.throws(() => buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000), /Choose a launch date/);

  form.bonding.startsAt = '2000-01-01T00:00:00Z';
  assert.match(validateLaunchStep(form, 'settings')['bonding-start'], /future/);
  form.bonding.scheduleEnabled = false;
  assert.equal(validateLaunchStep(form, 'settings')['bonding-start'], undefined);
  assert.equal(buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000).starts_at, '1800000060');
  assert.equal(form.bonding.startsAt, '2000-01-01T00:00:00Z');

  form.bonding.startsAt = '2030-01-02T07:00:00+03:00';
  form.bonding.scheduleEnabled = true;
  assert.equal(validateLaunchStep(form, 'settings')['bonding-start'], undefined);
  assert.equal(buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000).starts_at, String(Date.parse(form.bonding.startsAt) / 1000));
});

test('auth-return drafts accept the schedule toggle and retain legacy scheduling semantics', () => {
  const form = draft();
  form.bonding.startsAt = '2030-01-02T07:00:00+03:00';
  assert.equal(isBondingDraft(form), true);
  form.bonding.scheduleEnabled = false;
  assert.equal(isBondingDraft(form), true);
  form.bonding.scheduleEnabled = 'false';
  assert.equal(isBondingDraft(form), false);
});

test('removing team allocation submits zero vesting while preserving the saved draft schedule', () => {
  const form = draft();
  form.allocation.teamShare = '0';
  const params = buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000);
  assert.equal(params.allocations.team_bps, 0);
  assert.equal(params.vesting.cliff_seconds, '0');
  assert.equal(params.vesting.duration_seconds, '0');
  assert.equal(form.allocation.cliffMonths, '2');
  assert.equal(form.allocation.vestingMonths, '6');
  const { validateLaunchStep } = loadSource('launch-validation.ts');
  const inactive = { ...form, allocation: { ...form.allocation, cliffMonths: '-1', vestingMonths: 'invalid' } };
  assert.equal(validateLaunchStep(inactive, 'allocation')['team-cliff'], undefined);
  assert.equal(validateLaunchStep(inactive, 'allocation')['team-vesting'], undefined);
  assert.equal(buildBondingCurveParams(inactive, owner, issuer, IMAGE_URL, 1_800_000_000).vesting.duration_seconds, '0');
});

test('team duration validation and contract mapping enforce the same upper bound', () => {
  const form = draft();
  const { validateLaunchStep } = loadSource('launch-validation.ts');
  form.allocation.cliffMonths = '100000000000000000000';
  assert.match(validateLaunchStep(form, 'allocation')['team-cliff'], /contract duration limit/);
  assert.throws(() => buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000), /contract duration limit/);
});

test('rejects unsupported methods, local image references, and invalid contract inputs before signing', () => {
  const invalid = [
    (f) => { f.method = 'basic'; },
    (f) => { f.method = 'fixed'; },
    (f) => { f.method = 'auction'; },
    (f) => { f.allocation.teamShare = '99.99'; },
    (f) => { f.allocation.teamShare = '100'; },
    (f) => { f.allocation.teamShare = 'abc'; },
    (f) => { f.supply = '0.00000001'; },
    (f) => { f.bonding.creatorPayout = '0.49'; },
    (f) => { f.allocation.vestingMonths = '-1'; },
    (f) => { f.allocation.cliffMonths = '100000000000000000000'; },
    (f) => { f.bonding.startsAt = '2000-01-01T00:00:00Z'; },
    (f) => { f.bonding.creatorFee = '100.01'; },
    (f) => { f.description = 'a'.repeat(3001); },
  ];
  for (const change of invalid) {
    const form = draft();
    change(form);
    assert.throws(() => buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000));
  }
  // Only the server-hosted URL may reach metadata.logo.
  for (const logo of ['', 'data:image/png;base64,abc', 'blob:https://app.local/1', 'logo.png']) {
    assert.throws(() => buildBondingCurveParams(draft(), owner, issuer, logo, 1_800_000_000));
  }
  assert.ok(isBondingDraft(draft()));
  assert.equal(isBondingDraft({ method: 'bonding' }), false);
});

function harness({ network = networkModule, signedIn = true, rejectLogin = false, rejectSetup = false, setupError, rejectSac = false, rejectReturn = false, factoryStatus = 'NOT_FOUND', balance, returnWait, accountStatus = 'registered', imageStatus = 'pending', uploadFailures = [], indexResult = 'ready', sacTimeout = false, factoryTimeout = false, lookupStatuses, setupLookupDelay = 0 } = {}) {
  const storage = new Map();
  const messages = [];
  const calls = [];
  const sends = [];
  const uploads = [];
  const statusChecks = [];
  const refreshes = [];
  const events = [];
  const confirmed = new Set();
  const lookups = [];
  const lookupCounts = new Map();
  const timeoutHash = 'a'.repeat(64);
  const timeout = () => new Error(`BLUX: Timed out waiting for transaction ${timeoutHash} to finalize.`);
  const progress = [];
  const issuedTokens = new Map();
  let transactionCount = 0;
  let factoryCalls = 0;
  let indexChecks = 0;
  const indexedSlugs = [];
  let indexed = indexResult;
  const store = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const runtimeMocks = {
    '@/lib/stellar/network': network,
    '@/lib/stellar/clients': { soroban: { getTransaction: async (hash) => {
      lookups.push(hash);
      const status = lookupStatuses?.[Math.min(lookups.length - 1, lookupStatuses.length - 1)] ?? factoryStatus;
      return { status, returnValue: status === 'SUCCESS' ? nativeToScVal(curve) : undefined };
    } } },
  };
  const state = loadSource('launch-state.ts', runtimeMocks);
  const transactions = loadSource('transactions.ts', runtimeMocks);
  const makeTransaction = (kind) => {
    const xdr = `${kind}:${++transactionCount}`;
    return { toXDR: () => xdr, hash: () => Buffer.from(xdr) };
  };
  const exports = loadSource('../hooks/use-bonding-launch.ts', {
    ...runtimeMocks,
    react: {
      useState: (value) => {
        let current = value;
        return [value, (next) => {
          current = typeof next === 'function' ? next(current) : next;
          if (current && typeof current === 'object' && ('status' in current || 'name' in current))
            progress.push(structuredClone(current));
        }];
      },
      useRef: (value) => ({ current: value }),
    },
    'next/navigation': {
      useRouter: () => ({ refresh: () => refreshes.push('refresh') }),
    },
    '@/lib/api/client': { ApiError },
    '@/lib/api/launches/images': {
      uploadLaunchImage: async (input) => {
        events.push('upload');
        uploads.push(input);
        if (uploadFailures.length) {
          const status = uploadFailures.shift();
          throw new ApiError(`Upload failed (${status})`, 'http', { status });
        }
        return { name: 'Server Project', slug: 'server-project', imageId: `image-${uploads.length}`, publicUrl: IMAGE_URL, status: 'pending' };
      },
      getLaunchImage: async (imageId) => {
        events.push('status-check');
        statusChecks.push(imageId);
        return {
          name: 'Server Project', slug: 'server-project', imageId, publicUrl: IMAGE_URL, status: imageStatus, network: network.API_NETWORK, ownerAddress: owner,
          launchContractId: null, assetContractId: null, cleanupReadyAt: null, expiredAt: null,
        };
      },
      fileFromDataUrl: (dataUrl) => ({ name: 'logo.png', type: 'image/png', dataUrl }),
      launchImageErrorMessage: (error) => error instanceof Error ? `image: ${error.message}` : 'image: upload failed',
    },
    '@bluxcc/react': {
      useBlux: () => ({ user: signedIn ? { address: owner } : null, isReady: true,
        sendTransaction: async (xdr, options) => {
          events.push(`send:${xdr.split(':')[0]}`);
          sends.push({ xdr, options });
          if (xdr.startsWith('setup:') && setupError) throw setupError;
          if (xdr.startsWith('setup:') && rejectSetup) { rejectSetup = false; throw new Error('Rejected setup signature'); }
          if (xdr.startsWith('sac:') && rejectSac) { rejectSac = false; throw new Error('Rejected SAC signature'); }
          if (xdr.startsWith('sac:') && sacTimeout) { confirmed.add(timeoutHash); throw timeout(); }
          confirmed.add(xdr);
          return { hash: xdr };
        },
      }),
      useWriteContract: () => ({ mutateAsync: async (call) => {
        events.push('factory');
        factoryCalls++;
        calls.push(call);
        if (factoryTimeout) throw timeout();
        return { hash: `factory-${factoryCalls}`, returnValue: async () => { await returnWait; if (rejectReturn) throw new Error('Result temporarily unavailable'); return curve; } };
      } }),
    },
    '@/lib/launchpad': { useLaunchpad: () => ({
      notify: (message) => messages.push(message),
      login: async (path) => {
        calls.push(path);
        if (rejectLogin) throw new Error('Login unavailable');
      },
      account: { status: accountStatus },
    }) },
    '../lib/indexing': {
      waitForIndexedLaunch: async (slug) => {
        indexedSlugs.push(slug);
        events.push('index');
        indexChecks++;
        return indexed;
      },
    },
    '../lib/launch-state': {
      ...state,
      isTransactionConfirmed: async (hash) => {
        if (!confirmed.has(hash)) return false;
        const count = (lookupCounts.get(hash) ?? 0) + 1;
        lookupCounts.set(hash, count);
        if (hash.startsWith('setup:') && count <= setupLookupDelay) {
          assert.equal(factoryCalls, 0);
          assert.equal(sends.some(send => send.xdr.startsWith('sac:')), false);
          return false;
        }
        return true;
      },
      checkPending: async (token) => confirmed.has(token.sacHash) ? { ...token, stage: 'sacConfirmed', sacXdr: undefined } : token,
    },
    '../lib/transactions': {
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
  return {
    flow: exports.useBondingLaunch(), indexedSlugs, storage, calls, sends, messages, progress, events, uploads, statusChecks, refreshes, lookups, lookupCounts,
    factoryCalls: () => factoryCalls,
    indexChecks: () => indexChecks,
    setIndexResult: (value) => { indexed = value; },
  };
}

function savedRecords(h) {
  return [...h.storage.entries()]
    .filter(([key]) => key.startsWith('launchpad:testnet-bonding:'))
    .map(([, value]) => JSON.parse(value));
}

test('Mainnet launch uses its own USDC, signing network, API uploads and recovery records', async () => {
  const network = { ...networkModule, API_NETWORK: 'public', NETWORK: Networks.PUBLIC, HOME_DOMAIN: 'lumenrise.app' };
  const h = harness({ network });
  assert.equal(h.flow.isReady, true);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.calls[0].call.args[0].pair, 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75');
  assert.equal(h.calls[0].options.network, Networks.PUBLIC);
  assert.ok(h.sends.every(send => send.options.network === Networks.PUBLIC));
  assert.equal(h.uploads[0].network, 'public');
  assert.ok([...h.storage.keys()].some(key => key.startsWith('launchpad:public-bonding:')));
  assert.ok(![...h.storage.keys()].some(key => key.startsWith('launchpad:testnet-bonding:')));
});

test('server launch availability still gates Mainnet before signing', async () => {
  const h = harness({ network: { ...networkModule, API_NETWORK: 'public', NETWORK: Networks.PUBLIC, LAUNCH_CONFIGURED: false } });
  assert.equal(h.flow.isReady, false);
  await h.flow.launch(draft());
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.uploads.length, 0);
});

test('launch waits through missing setup lookups before deployment and factory creation', async () => {
  const h = harness({ setupLookupDelay: 3 });
  await h.flow.launch(draft());
  assert.equal(h.lookupCounts.get('setup:1'), 4);
  assert.equal(h.sends.length, 2);
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('ten missing setup lookups stop the next launch transaction and preserve the record', async () => {
  const h = harness({ setupLookupDelay: 10 });
  await h.flow.launch(draft());
  assert.equal(h.lookupCounts.get('setup:1'), 10);
  assert.equal(h.sends.length, 1);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(savedRecords(h)[0].token.stage, 'setupPending');
  assert.match(h.progress.at(-1).message, /still pending/);
});

for (const stage of ['sac', 'factory']) test(`Mainnet ${stage} timeout recovers the submitted hash without signing twice`, async () => {
  const network = { ...networkModule, API_NETWORK: 'public', NETWORK: Networks.PUBLIC, HOME_DOMAIN: 'lumenrise.app' };
  const h = harness({ network, sacTimeout: stage === 'sac', factoryTimeout: stage === 'factory', lookupStatuses: ['NOT_FOUND', 'NOT_FOUND', 'SUCCESS'] });
  await h.flow.launch(draft());
  assert.equal(h.sends.length, 2);
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.lookups.length, 3);
  assert.equal(h.progress.at(-1).status, 'success');
  const record = JSON.parse([...h.storage.entries()].find(([key]) => key.startsWith('launchpad:public-bonding:'))[1]);
  assert.equal(stage === 'sac' ? record.token.sacHash : record.factoryHash, 'a'.repeat(64));
});

test('an unresolved factory timeout preserves its hash and retry only checks that hash', async () => {
  const h = harness({ factoryTimeout: true });
  await h.flow.launch(draft());
  assert.equal(savedRecords(h)[0].factoryHash, 'a'.repeat(64));
  assert.equal(h.lookups.length, 10);
  assert.equal(h.progress.at(-1).status, 'error');
  await h.flow.launch(draft());
  assert.equal(h.lookups.length, 20);
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.sends.length, 2);
});

test('only bonding reaches the factory, with the uploaded image URL and explicit testnet', async () => {
  const h = harness();
  await h.flow.launch({ ...draft(), method: 'basic' });
  await h.flow.launch({ ...draft(), method: 'fixed' });
  await h.flow.launch({ ...draft(), method: 'auction' });
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.uploads.length, 0);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.calls[0].call.address, FACTORY_CONTRACT_ID);
  assert.equal(h.calls[0].call.fn, 'create_bonding_curve');
  assert.equal(h.calls[0].call.args.length, 1);
  assert.equal(typeof h.calls[0].call.args[0], 'object');
  // metadata.logo is exactly the URL returned by the image upload.
  assert.equal(h.calls[0].call.args[0].metadata.logo, IMAGE_URL);
  assert.equal(h.calls[0].call.args[0].metadata.name, 'Server Project');
  assert.equal(h.uploads[0].name, draft().name);
  assert.deepEqual(h.indexedSlugs, ['server-project']);
  assert.equal(h.calls[0].options.network, Networks.TESTNET);
  assert.ok(h.sends.every((send) => send.options.network === Networks.TESTNET));
  // The upload ran before any wallet transaction, addressed to the owner.
  assert.equal(h.uploads.length, 1);
  assert.equal(h.uploads[0].network, 'testnet');
  assert.equal(h.uploads[0].ownerAddress, owner);
  assert.equal(h.events[0], 'upload');
  assert.deepEqual(h.events, ['upload', 'send:setup', 'send:sac', 'factory', 'index']);
  const saved = savedRecords(h)[0];
  assert.equal(saved.curveAddress, curve);
  assert.equal(saved.token.issuerSecret, undefined);
  assert.equal(saved.image.publicUrl, IMAGE_URL);
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.uploads.length, 1);
  await h.flow.launch({ ...draft(), name: 'Another token' });
  assert.equal(h.factoryCalls(), 2);
  assert.equal(h.uploads.length, 2);
});

test('legacy Basic and lock records cannot resume in the Bonding flow', async () => {
  const { isLaunchRecord } = loadSource('launch-state.ts');
  const h = harness();
  const legacyKey = `launchpad:testnet:${owner}`;
  const legacy = JSON.stringify({
    ...draft(), method: 'basic', stage: 'depositPending', depositHash: 'old-lock',
  });
  h.storage.set(legacyKey, legacy);
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.calls[0].call.fn, 'create_bonding_curve');
  assert.equal(h.storage.get(legacyKey), legacy);
  const token = savedRecords(h)[0].token;
  for (const stage of ['depositPending', 'locked', 'withdrawPending', 'complete']) {
    assert.equal(isLaunchRecord({ ...token, stage }), false);
  }
});

test('launch network failures without a response reach the operation dialog without rejecting', async () => {
  const setupError = Object.assign(new Error('Network request failed'), { response: undefined });
  const h = harness({ setupError });
  await assert.doesNotReject(() => h.flow.launch(draft()));
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.progress.at(-1).message, 'Network request failed');
  assert.equal(h.factoryCalls(), 0);
  assert.equal(savedRecords(h)[0].token.stage, 'setupPending');
});

test('launch errors preserve their message when response metadata is missing or malformed', () => {
  const { describeError } = loadSource('launch-state.ts');
  for (const response of [undefined, null, false, 'offline', {}, { data: null },
    { data: { extras: null } }, { data: { extras: { result_codes: { operations: 'invalid' } } } }]) {
    const error = Object.assign(new Error('Original network error'), { response });
    assert.equal(describeError(error), 'Original network error');
  }
  for (const error of [undefined, null, {}, { response: undefined }]) {
    assert.equal(describeError(error), 'Something went wrong. Check your wallet and try again.');
  }
  assert.equal(describeError({ response: { data: { extras: { result_codes: {
    transaction: 'tx_failed', operations: ['op_underfunded', null, 42],
  } } } } }), 'Stellar rejected the transaction: tx_failed, op_underfunded.');
});

test('transaction lookup preserves network errors and only treats an HTTP 404 as unconfirmed', async () => {
  for (const response of [undefined, null, { status: 503 }, { status: 404 }]) {
    const error = Object.assign(new Error('Horizon request failed'), { response });
    const { isTransactionConfirmed } = loadSource('launch-state.ts', {
      './transactions': { horizon: { transactions: () => ({ transaction: () => ({
        call: async () => { throw error; },
      }) }) } },
    });
    if (response?.status === 404) {
      assert.equal(await isTransactionConfirmed('pending-hash'), false);
    } else {
      await assert.rejects(() => isTransactionConfirmed('pending-hash'), (cause) => cause === error);
    }
  }
});

test('pending SAC deployment waits for SUCCESS before advancing the launch stage', async () => {
  let lookups = 0;
  const { checkPending } = loadSource('launch-state.ts', {
    '@/lib/stellar/clients': { soroban: { getTransaction: async () => ({ status: ++lookups < 4 ? 'NOT_FOUND' : 'SUCCESS' }) } },
  });
  const record = { stage: 'sacPending', sacHash: 'sac-hash', sacXdr: 'saved-deployment' };
  const result = await checkPending(record);
  assert.equal(lookups, 4);
  assert.equal(result.stage, 'sacConfirmed');
  assert.equal(result.sacXdr, undefined);
});

test('missing SAC deployment remains pending after ten checks without resetting for resubmission', async () => {
  let lookups = 0;
  const { checkPending } = loadSource('launch-state.ts', {
    '@/lib/stellar/clients': { soroban: { getTransaction: async () => { lookups++; return { status: 'NOT_FOUND' }; } } },
  });
  const record = { stage: 'sacPending', sacHash: 'sac-hash', sacXdr: 'saved-deployment' };
  await assert.rejects(checkPending(record), /still pending/);
  assert.equal(lookups, 10);
  assert.equal(record.stage, 'sacPending');
  assert.equal(record.sacHash, 'sac-hash');
});

test('rejected SAC approval resumes the same issued token and reuses the uploaded image', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.progress.at(-1).step, 'deploy');
  assert.equal(h.progress.at(-1).phase, 'working');
  const retryStart = h.progress.length;
  const previousHashes = h.progress.at(-1).transactionHashes;
  await h.flow.launch(draft());
  assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 1);
  assert.equal(h.factoryCalls(), 1);
  // The valid image was not uploaded again; its status was checked instead.
  assert.equal(h.uploads.length, 1);
  assert.equal(h.statusChecks.length, 1);
  assert.deepEqual([...new Set(h.progress.slice(retryStart).map((event) => event.step))], ['check', 'logo', 'deploy', 'curve', 'index']);
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.progress.at(-1).transactionHashes.setup, previousHashes.setup);
  assert.equal(h.progress.at(-1).transactionHashes.issue, previousHashes.issue);
});

test('a changed project image uploads again instead of reusing the previous upload', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch(draft());
  assert.equal(h.uploads.length, 1);
  await h.flow.launch({ ...draft(), logo: 'data:image/png;base64,changed' });
  assert.equal(h.uploads.length, 2);
  assert.equal(h.statusChecks.length, 0);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('optional links reach prelaunch but never enter contract metadata', async () => {
  const h = harness();
  const links = { website: ' https://example.com/project ', xAccount: ' https://x.com/project ' };
  await h.flow.launch({ ...draft(), ...links });
  assert.equal(h.uploads[0].website, links.website);
  assert.equal(h.uploads[0].xAccount, links.xAccount);
  assert.equal(h.uploads[0].description, draft().description);
  const params = h.calls[0].call.args[0];
  assert.equal(params.metadata.logo, IMAGE_URL);
  assert.equal('website' in params.metadata, false);
  assert.equal('xAccount' in params.metadata, false);
  assert.equal(JSON.stringify(params).includes('https://example.com/project'), false);
  assert.equal(JSON.stringify(params).includes('https://x.com/project'), false);
});

test('a changed description sends a fresh prelaunch on retry', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch(draft());
  await h.flow.launch({ ...draft(), description: 'Updated project description.' });
  assert.equal(h.uploads.length, 2);
  assert.equal(h.uploads[1].description, 'Updated project description.');
  assert.equal(h.statusChecks.length, 0);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('adding, changing, or clearing either optional link forces a fresh prelaunch on retry', async () => {
  for (const field of ['website', 'xAccount']) {
    for (const [before, after] of [
      ['', 'https://example.com/new'],
      ['https://example.com/old', 'https://example.com/new'],
      ['https://example.com/old', ''],
      ['https://example.com/old', '   '],
    ]) {
      const h = harness({ rejectSac: true });
      await h.flow.launch({ ...draft(), [field]: before });
      await h.flow.launch({ ...draft(), [field]: after });
      assert.equal(h.uploads.length, 2, `${field}: ${before} -> ${after}`);
      assert.equal(h.uploads[1][field], after);
      assert.equal(h.statusChecks.length, 0);
      assert.equal(h.progress.at(-1).status, 'success');
      assert.equal(h.sends.filter((send) => send.xdr.startsWith('setup:')).length, 1);
    }
  }
});

test('surrounding whitespace in optional links reuses the same prelaunch on retry', async () => {
  const h = harness({ rejectSac: true });
  await h.flow.launch({ ...draft(), website: 'https://example.com', xAccount: 'https://x.com/project' });
  await h.flow.launch({ ...draft(), website: ' https://example.com ', xAccount: ' https://x.com/project ' });
  assert.equal(h.uploads.length, 1);
  assert.equal(h.statusChecks.length, 1);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('an expired stored image uploads again before any transaction', async () => {
  const h = harness({ rejectSac: true, imageStatus: 'expired' });
  await h.flow.launch(draft());
  assert.equal(h.uploads.length, 1);
  await h.flow.launch(draft());
  assert.equal(h.uploads.length, 2);
  assert.equal(h.statusChecks.length, 1);
  assert.equal(h.progress.at(-1).status, 'success');
});

test('an image upload failure stops the launch before any wallet transaction', async () => {
  const h = harness({ uploadFailures: [403] });
  await h.flow.launch(draft());
  assert.equal(h.uploads.length, 1);
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.progress.at(-1).status, 'error');
  assert.equal(h.progress.at(-1).step, 'logo');
  assert.match(h.progress.at(-1).message, /Upload failed \(403\)/);
});

test('launching requires a registered account for the image upload', async () => {
  for (const accountStatus of ['unregistered', 'checking']) {
    const h = harness({ accountStatus });
    await h.flow.launch(draft());
    assert.equal(h.uploads.length, 0);
    assert.equal(h.sends.length, 0);
    assert.equal(h.factoryCalls(), 0);
    assert.equal(h.progress.at(-1).status, 'error');
    assert.equal(h.progress.at(-1).step, 'check');
  }
});

test('a pending server index keeps the confirmed hash and retries without another transaction', async () => {
  const h = harness({ indexResult: 'pending' });
  await h.flow.launch(draft());
  const stalled = h.progress.at(-1);
  assert.equal(stalled.status, 'error');
  assert.equal(stalled.step, 'index');
  assert.match(stalled.message, /still preparing/);
  assert.equal(stalled.transactionHashes.curve, 'factory-1');
  assert.equal(h.refreshes.length, 0);
  // Retrying only re-checks the index: no new signature, factory call, or upload.
  const sendCount = h.sends.length;
  h.setIndexResult('ready');
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.sends.length, sendCount);
  assert.equal(h.uploads.length, 1);
  assert.equal(h.indexChecks(), 2);
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.progress.at(-1).curveAddress, curve);
  assert.equal(h.refreshes.length, 1);
});

test('a submitted factory transaction is not duplicated when its result is unavailable', async () => {
  const h = harness({ rejectReturn: true });
  await h.flow.launch(draft());
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.uploads.length, 1);
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
  assert.equal(signedOut.uploads.length, 0);
  assert.equal(signedOut.progress.length, 0);
  assert.deepEqual(JSON.parse(signedOut.storage.get('launchpad:bonding-auth-return')), draft());
});

test('progress follows actual stages and wallet approvals, then completes with an indexed curve address', async () => {
  const h = harness();
  await h.flow.launch(draft());
  assert.deepEqual([...new Set(h.progress.map((event) => event.step))], ['check', 'logo', 'setup', 'issue', 'deploy', 'curve', 'index']);
  assert.deepEqual(h.progress.filter((event) => event.phase === 'approval').map((event) => event.step), ['setup', 'deploy', 'curve']);
  const result = h.progress.at(-1);
  assert.equal(result.status, 'success');
  assert.equal(result.curveAddress, curve);
  assert.equal(result.hash, 'factory-1');
  assert.deepEqual(result.transactionHashes, {
    setup: 'setup:1', issue: 'issuance:2', deploy: 'sac:3', curve: 'factory-1', index: 'factory-1',
  });
  assert.equal(h.progress.find((event) => event.step === 'deploy' && event.phase === 'approval').transactionHashes.issue, 'issuance:2');
  assert.equal(h.messages.length, 0);
  assert.equal(h.refreshes.length, 1);
});

test('launch errors and recovered results stay in the operation dialog without duplicate toasts', async () => {
  const h = harness({ rejectReturn: true, factoryStatus: 'SUCCESS' });
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'error');
  const previousHashes = h.progress.at(-1).transactionHashes;
  assert.equal(h.messages.length, 0);
  await h.flow.launch(draft());
  assert.equal(h.progress.at(-1).status, 'success');
  assert.deepEqual(h.progress.at(-1).transactionHashes, {
    ...previousHashes,
    // The index step links the same confirmed launch transaction.
    index: 'factory-1',
  });
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
  assert.equal(h.uploads.length, 1);
  assert.equal(h.progress.at(-1).status, 'success');
  assert.equal(h.progress.at(-1).curveAddress, curve);
});

test('invalid launch settings stop at validation before any wallet transaction', async () => {
  const h = harness();
  await h.flow.launch({ ...draft(), supply: '0' });
  assert.equal(h.sends.length, 0);
  assert.equal(h.uploads.length, 0);
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
  assert.equal(h.uploads.length, 1);
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
  assert.equal(restored.image.publicUrl, previous.image.publicUrl);
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

function indexingHarness(behavior) {
  const checks = [];
  const indexing = loadSource('indexing.ts', {
    '@/lib/api/client': { ApiError },
    '@/lib/api/launches/public': {
      getIndexedLaunch: async (contractId, options) => {
        checks.push([contractId, options.network]);
        return behavior(checks.length);
      },
    },
  }, { setTimeout: (resolve) => { resolve(); return 0; } });
  return { indexing, checks };
}

const httpError = (status) => new ApiError(`HTTP ${status}`, 'http', { status });

test('index polling waits through 404 and 503 responses until the launch appears', async () => {
  const failures = [404, 503, 404];
  const h = indexingHarness(() => {
    const status = failures.shift();
    if (status) throw httpError(status);
  });
  const result = await h.indexing.waitForIndexedLaunch(curve, 'testnet');
  assert.equal(result, 'ready');
  assert.equal(h.checks.length, 4);
  assert.ok(h.checks.every(([id, network]) => id === curve && network === 'testnet'));
});

test('index polling is bounded and reports pending instead of failing the launch', async () => {
  const h = indexingHarness(() => { throw httpError(404); });
  const result = await h.indexing.waitForIndexedLaunch(curve, 'testnet');
  assert.equal(result, 'pending');
  assert.equal(h.checks.length, 11);
});

test('index polling aborts on unexpected errors and treats network trouble as temporary', async () => {
  const unexpected = indexingHarness(() => { throw httpError(400); });
  await assert.rejects(() => unexpected.indexing.waitForIndexedLaunch(curve, 'testnet'));
  assert.equal(unexpected.checks.length, 1);
  const offline = indexingHarness((attempt) => {
    if (attempt < 3) throw new ApiError('Could not reach the server.', 'network');
  });
  assert.equal(await offline.indexing.waitForIndexedLaunch(curve, 'testnet'), 'ready');
  assert.equal(offline.checks.length, 3);
});

test('accepts zero team vesting and maps percentage fees exactly without an expiry', () => {
  const form = draft();
  form.allocation.vestingMonths = '0';
  form.description = 'a'.repeat(3000);
  form.bonding.creatorFee = '1.25';
  const params = buildBondingCurveParams(form, owner, issuer, IMAGE_URL, 1_800_000_000);
  assert.equal(params.vesting.duration_seconds, '0');
  assert.equal(params.curve.creator_fee_bps, 125);
  assert.equal(Object.hasOwn(params, 'ends_at'), false);
});


test('a name conflict preserves the draft, exposes a name error and stops before signing', async () => {
  const h = harness({ uploadFailures: [409] });
  const form = draft(), original = structuredClone(form);
  await h.flow.launch(form);
  assert.deepEqual(form, original);
  assert.equal(h.sends.length, 0);
  assert.equal(h.factoryCalls(), 0);
  assert.equal(h.storage.size, 0);
  assert.ok(h.progress.some(value => value?.name === form.name && /409/.test(value.message)));
  await h.flow.launch({ ...form, name: 'A different project' });
  assert.equal(h.factoryCalls(), 1);
});

test('legacy confirmed records without a slug stay in indexing recovery without contract-address API reads', async () => {
  const h = harness();
  await h.flow.launch(draft());
  const [key, stored] = [...h.storage.entries()].find(([key]) => key.startsWith('launchpad:testnet-bonding:'));
  const record = JSON.parse(stored);
  delete record.image;
  h.storage.set(key, JSON.stringify(record));
  const checks = h.indexedSlugs.length;
  await h.flow.launch(draft());
  assert.equal(h.factoryCalls(), 1);
  assert.equal(h.indexedSlugs.length, checks);
  assert.match(h.progress.at(-1).message, /still preparing/);
});
