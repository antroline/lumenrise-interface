import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from './config.fixture.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const response = (result, status = 200, retryAfter) => ({
  ok: status < 400, status,
  headers: { get: () => retryAfter },
  text: async () => JSON.stringify({ status: status < 400 ? 'success' : 'error', message: 'Server response', result }),
});
function harness(handler = () => response(configuration), bitmap = { width: 128, height: 128 }) {
  const calls = [], cache = new Map();
  let closed = 0;
  const globals = {
    URL, URLSearchParams, AbortController, FormData, File, Error, Date,
    setTimeout, clearTimeout,
    window: { location: { origin: 'https://app.example' } },
    createImageBitmap: async () => ({ ...bitmap, close() { closed++; } }),
    fetch: async (url, init) => { calls.push({ url, init }); return handler(url, init); },
  };
  function load(name) {
    const path = resolve(root, name);
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(code, {
      ...globals, module, exports: module.exports,
      require: name => {
        if (name === '@stellar/stellar-sdk' && path.endsWith('clients.ts')) {
          const sdk = require(name);
          const passphrase = url => url.endsWith('/public') ? sdk.Networks.PUBLIC : sdk.Networks.TESTNET;
          return { ...sdk,
            Horizon: { Server: class extends sdk.Horizon.Server {
              constructor(url) { super(url); this.fixturePassphrase = passphrase(url); }
              async root() { return { network_passphrase: this.fixturePassphrase }; }
            } },
            rpc: { Server: class extends sdk.rpc.Server {
              constructor(url) { super(url); this.fixturePassphrase = passphrase(url); }
              async getNetwork() { return { passphrase: this.fixturePassphrase }; }
            } },
          };
        }
        return name.startsWith('.') ? load(resolve(dirname(path), name + '.ts')) : name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name);
      },
    }, { filename: path });
    return module.exports;
  }
  const api = load('lib/api/config.ts'), client = load('lib/api/client.ts');
  return { api, client, calls, load, closed: () => closed };
}

test('configuration uses the standard envelope, no-store, independent API origin and one concurrent read', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  h.client.configureApi('https://api.example/v1/');
  assert.throws(() => h.api.getConfiguration(), /not loaded/);
  const first = h.api.loadConfiguration(), second = h.api.loadConfiguration();
  assert.equal(first, second);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, 'https://api.example/v1/config');
  assert.equal(h.calls[0].init.cache, 'no-store');
  assert.equal(h.calls[0].init.headers['X-Stellar-Network'], undefined);
  release(response(configuration));
  await first;
  assert.equal((await h.api.loadConfiguration()).auth.appId, configuration.auth.appId);
  assert.equal(h.calls.length, 1);
});

test('HTTP, network and invalid configuration failures can be retried without cached defaults', async () => {
  for (const failure of [() => response(null, 503), () => { throw new Error('Offline'); }, () => response({ version: 1 }), () => response({ ...configuration, auth: { appId: '' } })]) {
    let failed = true;
    const h = harness(() => failed ? failure() : response(configuration));
    await assert.rejects(h.api.loadConfiguration());
    assert.throws(() => h.api.getConfiguration(), /not loaded/);
    failed = false;
    await h.api.loadConfiguration();
    assert.equal(h.calls.length, 2);
  }
});

test('critical fields and inconsistent rule boundaries fail explicitly; optional launch settings may be empty', () => {
  const h = harness();
  for (const mutate of [
    c => { c.version = 2; }, c => { c.network.default = 'futurenet'; },
    c => { c.network.header = 'Wrong-Header'; }, c => { c.network.supported = []; },
    c => { c.network.configurations.public.network = 'testnet'; },
    c => { c.network.configurations.testnet.horizonUrl = 'javascript:bad'; },
    c => { c.network.configurations.testnet.launchConfigured = true; c.network.configurations.testnet.factoryContractId = ''; },
    c => { c.network.configurations.testnet.factoryContractId = 'C'.repeat(56); },
    c => { c.rules.images.mimeTypes = null; }, c => { c.uploads.avatar.maxBytes = -1; },
    c => { c.rules.team.roleMinLength = 90; }, c => { c.rules.launches.defaultLimit = 101; },
    c => { c.rules.launches.sorts = []; },
  ]) {
    const config = structuredClone(configuration); mutate(config);
    assert.throws(() => h.api.decodeConfiguration(config), /configuration/);
  }
  const config = structuredClone(configuration);
  Object.assign(config.network.configurations.public, { rpcUrl: '', factoryContractId: '', homeDomain: '', launchConfigured: false });
  assert.equal(h.api.decodeConfiguration(config).network.configurations.public.launchConfigured, false);
});

test('network selection respects the server default and rejects unsupported selections', () => {
  const h = harness(), config = structuredClone(configuration);
  config.network.default = 'public';
  assert.equal(h.api.selectNetwork(config, null), 'public');
  assert.equal(h.api.selectNetwork(config, 'mainnet'), 'public');
  assert.equal(h.api.selectNetwork(config, 'testnet'), 'testnet');
  assert.throws(() => h.api.selectNetwork(config, 'typo'), /selected network/);
  config.network.supported = ['public'];
  assert.throws(() => h.api.selectNetwork(config, 'testnet'), /selected network/);
});

for (const network of ['testnet', 'public']) test(`Blux, clients, transaction passphrase and issuance domain agree on ${network}`, async () => {
  const h = harness();
  const config = await h.api.loadConfiguration();
  const runtime = h.load('lib/stellar/network.ts');
  runtime.configureNetwork(config, network);
  const clients = h.load('lib/stellar/clients.ts');
  assert.equal(clients.horizon, undefined);
  await clients.initializeStellarClients();
  assert.equal(clients.horizon.serverURL.href, config.network.configurations[network].horizonUrl);
  const blux = h.load('lib/blux-config.ts').createBluxConfig(config, config.network.configurations[network]);
  assert.equal(blux.appId, config.auth.appId);
  assert.equal(blux.networks[0], runtime.NETWORK);
  assert.equal(blux.defaultNetwork, runtime.NETWORK);
  assert.equal(blux.transports[runtime.NETWORK].soroban, config.network.configurations[network].rpcUrl);
  const { Account, Keypair } = require('@stellar/stellar-sdk');
  const owner = Keypair.random(), issuer = Keypair.random();
  const transactions = h.load('features/create-launch/lib/transactions.ts');
  const setup = transactions.buildSetup(new Account(owner.publicKey(), '1'), issuer.publicKey(), 'TOK');
  assert.equal(setup.networkPassphrase, runtime.NETWORK);
  const issuance = transactions.buildIssuance(new Account(issuer.publicKey(), '1'), issuer.secret(), owner.publicKey(), 'TOK', '100');
  assert.equal(issuance.networkPassphrase, runtime.NETWORK);
  assert.equal(issuance.operations[1].homeDomain, config.network.configurations[network].homeDomain);
  if (network === 'public') {
    const { initialLaunchDraft } = h.load('features/create-launch/lib/launch-draft.ts');
    const { buildBondingCurveParams } = h.load('features/create-launch/lib/bonding-curve.ts');
    const params = buildBondingCurveParams({ ...initialLaunchDraft, name: 'Mainnet token', symbol: 'MAIN', description: 'Mainnet launch' }, owner.publicKey(), issuer.publicKey(), 'https://images.example/logo.png');
    assert.equal(params.pair, 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75');
    assert.equal(params.asset, new (require('@stellar/stellar-sdk').Asset)('MAIN', issuer.publicKey()).contractId(runtime.NETWORK));
  }
  h.client.configureApiNetwork(network, config.network.supported);
  await h.client.apiRequest('/launches/test');
  assert.equal(h.calls.at(-1).init.headers['X-Stellar-Network'], network);
  await assert.rejects(h.client.apiRequest('/launches?network=public', { network: 'testnet' }), /Conflicting/);
});

test('Retry-After is enforced per resource, user and network and invalid headers are ignored', async () => {
  const h = harness(() => response({}, 429, '60'));
  h.client.configureApiNetwork('public', ['testnet', 'public']);
  await assert.rejects(h.client.apiRequest('/user/score'), e => e.status === 429 && e.retryAfterMs === 60000);
  await assert.rejects(h.client.apiRequest('/user/score'), e => e.status === 429 && e.retryAfterMs > 0);
  assert.equal(h.calls.length, 1);
  await assert.rejects(h.client.apiRequest('/user/score', { network: 'testnet' }));
  assert.equal(h.calls.length, 2);
  h.client.setApiUserId('42');
  await assert.rejects(h.client.apiRequest('/user/score'));
  assert.equal(h.calls.length, 3);
  const invalid = harness(() => response({}, 429, 'invalid'));
  await assert.rejects(invalid.client.apiRequest('/user/score'), e => e.retryAfterMs === undefined);
});

test('image checks honor exact bytes, asymmetric dimensions, pixel caps, MIME types and flags', async () => {
  const config = structuredClone(configuration);
  config.uploads.avatar.maxBytes = 4;
  Object.assign(config.rules.images, { minWidth: 128, minHeight: 256, maxInputPixels: 32768 });
  for (const [bitmap, valid] of [[{width:128,height:256},true], [{width:127,height:256},false], [{width:128,height:255},false], [{width:129,height:256},false]]) {
    const h = harness(() => response(config), bitmap); await h.api.loadConfiguration();
    const rules = h.load('lib/client-rules.ts');
    assert.equal(await rules.validateImage(new File(['1234'], 'x.png', { type: 'image/png' }), 'avatar') === null, valid);
    assert.equal(h.closed(), 1);
    assert.match(await rules.validateImage(new File(['12345'], 'x.png', { type: 'image/png' }), 'avatar'), /up to/);
    assert.match(await rules.validateImage(new File(['1'], 'x.gif', { type: 'image/gif' }), 'avatar'), /Choose/);
  }
  config.features.imageUploads = false;
  const h = harness(() => response(config)); await h.api.loadConfiguration();
  assert.match(await h.load('lib/client-rules.ts').validateImage(new File(['1'], 'x.png', { type: 'image/png' }), 'avatar'), /not configured/);
});

test('profile/team text, search, project URL and pagination boundaries follow changed server rules', async () => {
  const config = structuredClone(configuration);
  config.rules.profile.nameMinLength = 2; config.rules.profile.nameMaxLength = 3;
  config.rules.projectLinks.maxLength = 30;
  config.rules.launches.maxLimit = 25;
  config.rules.launches.searchMaxLength = 3;
  const h = harness(() => response(config)); await h.api.loadConfiguration();
  const rules = h.load('lib/client-rules.ts');
  assert.equal(rules.validateText(' AB ', 2, 3, 'Name'), 'AB');
  assert.throws(() => rules.validateText('A', 2, 3, 'Name'));
  assert.throws(() => rules.validateText('ABCD', 2, 3, 'Name'));
  for (const url of ['http://example.com', 'https://localhost', 'https://user:pass@example.com', 'https://example.com/' + 'x'.repeat(20)]) assert.equal(rules.validProjectLink(url), false);
  assert.equal(rules.validProjectLink('https://example.com'), true);
  assert.equal(rules.validProjectLink('', true), false);
  assert.equal(rules.validProjectLink(''), true);
  const market = h.load('lib/api/launches/market.ts');
  for (const [page,limit,filters] of [[0,20,{}], [1,26,{}], [1,20,{search:'long'}], [1,20,{sort:'invalid'}]]) await assert.rejects(market.getLaunchList('testnet',page,limit,undefined,undefined,filters), e => e.status === 400);
  const team = h.load('lib/api/launches/team.ts');
  await assert.rejects(team.searchTeamCandidates('id','a',{network:'testnet'}), /Search/);
  h.client.setApiUserId('42');
  await assert.rejects(h.load('lib/api/auth.ts').registerAccount({ name: 'A' }), /Name/);
  assert.equal(h.calls.length, 1);
});

test('chart availability and request size use server rules while retaining supported display mappings', async () => {
  const config = structuredClone(configuration);
  config.rules.chart.timeframes = ['4h'];
  config.rules.chart.defaultLimit = 17;
  const h = harness(url => url.endsWith('/config') ? response(config) : response({}));
  await h.api.loadConfiguration();
  const market = h.load('lib/api/launches/market.ts');
  assert.deepEqual(Array.from(market.getChartRanges()), ['1W']);
  await assert.rejects(market.getChart('id', 'public', '1D'), e => e.status === 400);
  assert.equal(h.calls.length, 1);
  // Deliberately malformed chart data fails decoding, but the actual request
  // must still carry the configured limit, timeframe and network.
  await assert.rejects(market.getChart('id', 'public', '1W'));
  const params = new URL(h.calls.at(-1).url, 'http://local').searchParams;
  assert.equal(params.get('limit'), '17');
  assert.equal(params.get('timeframes'), '4h');
  assert.equal(h.calls.at(-1).init.headers['X-Stellar-Network'], 'public');
});

test('disabled registration is availability, not a fabricated service-health result', async () => {
  const config = structuredClone(configuration); config.features.registration = false;
  const h = harness(() => response(config)); await h.api.loadConfiguration();
  h.client.setApiUserId('42');
  await assert.rejects(h.load('lib/api/auth.ts').registerAccount({ name: 'Name' }), /not configured/);
  assert.equal(h.calls.length, 1);
});
