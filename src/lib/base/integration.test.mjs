import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../api/config.fixture.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DID = 'did:privy:test-user';
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const HASH = '0x' + 'a'.repeat(64);
const DATE = '2026-10-28T12:00:00Z';
const baseConfiguration = {
  ...configuration, rules: { ...configuration.rules, launches: { ...configuration.rules.launches, amountScale: null, priceScale: null } }, chain: 'base', auth: { appId: 'public-privy-app' },
  network: {
    default: 'testnet', header: 'X-Network', supported: ['testnet', 'public'],
    configurations: {
      testnet: { network: 'testnet', chainId: 84532, factoryContractId: ADDRESS, launchConfigured: true },
      public: { network: 'public', chainId: 8453, factoryContractId: '', launchConfigured: false },
    },
  },
  features: { registration: true, imageUploads: true, githubConnection: false, xConnection: false },
};
const trade = { trader: ADDRESS, tradedAt: DATE, asset: ADDRESS, side: 'buy', assetAmount: '100000000000000000001', executionPrice: '10000001' };
const registered = { registered: true, userId: DID, identityId: 'identity-base', name: 'Alice', avatarUrl: null };
const response = (result, status = 200, retryAfter) => new Response(JSON.stringify({
  status: status === 202 ? 'pending' : status >= 400 ? 'error' : 'success',
  message: 'Test response', result,
}), { status, headers: retryAfter ? { 'Retry-After': retryAfter } : undefined });
function harness(handler = () => response({})) {
  const calls = [], modules = new Map(), storage = new Map();
  const globals = {
    URL, URLSearchParams, AbortController, DOMException, FormData, File, Response, TextEncoder,
    setTimeout, clearTimeout, Date, Error, Event,
    window: { dispatchEvent() {}, location: { pathname: '/settings', search: '?network=base-sepolia', hash: '#profile' },
      sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } }, navigator: {},
    localStorage: {
      get length() { return storage.size; }, key: i => [...storage.keys()][i] ?? null,
      getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
    },
    createImageBitmap: async () => ({ width: 128, height: 128, close() {} }),
    fetch: async (url, init) => { calls.push({ url, init }); return handler(url, init); },
  };
  function load(name) {
    const path = resolve(root, name);
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(code, {
      ...globals, module, exports: module.exports,
      require: name => name.startsWith('.') ? load(resolve(dirname(path), name + '.ts'))
        : name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name),
    }, { filename: path });
    return module.exports;
  }
  const client = load('lib/api/client.ts');
  client.configureApi('https://api.example/v1');
  client.configureApiContext({ chain: 'base', network: 'testnet' });
  const tokens = [], expired = [];
  function authenticate(getToken = async () => `token-${tokens.length + 1}`) {
    client.setApiUserId(DID);
    client.setBaseAuthentication({ userId: DID, getAccessToken: async () => {
      const token = await getToken(); tokens.push(token); return token;
    }, onExpired: () => expired.push(true) });
  }
  return { load, client, calls, storage, tokens, expired, authenticate };
}

test('Base config uses shared /config and no Stellar-only fields or credentials', async () => {
  const h = harness(() => response(baseConfiguration)), api = h.load('lib/api/config.ts');
  const config = await api.loadConfiguration();
  assert.equal(config.chain, 'base');
  assert.equal(config.network.configurations.testnet.chainId, 84532);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].init.headers)), { 'X-Chain': 'base', 'X-Network': 'testnet' });
  assert.equal(h.calls[0].init.cache, 'no-store');
  assert.equal('rpcUrl' in config.network.configurations.testnet, false);
  assert.equal('appSecret' in config.auth, false);
  assert.equal((await api.loadConfiguration()), config);
  for (const mutation of [c => { c.network.header = 'X-Stellar-Network'; }, c => { c.network.configurations.testnet.chainId = 8453; }]) {
    const config = structuredClone(baseConfiguration); mutation(config);
    assert.throws(() => api.decodeConfiguration(config), /configuration/);
  }
  const browsing = structuredClone(baseConfiguration); browsing.auth.appId = ''; browsing.features.registration = false;
  assert.equal(api.decodeConfiguration(browsing).auth.appId, '');
});

test('Base authentication return paths are isolated from Stellar and the other Base environment', () => {
  const h = harness(), auth = h.load('lib/auth-return.ts');
  auth.saveAuthReturnTo();
  h.client.configureApiContext({ chain: 'base', network: 'public' });
  assert.equal(auth.consumeAuthReturnTo(), '/');
  h.client.configureApiContext({ chain: 'stellar', network: 'testnet' });
  assert.equal(auth.consumeAuthReturnTo(), '/');
  h.client.configureApiContext({ chain: 'base', network: 'testnet' });
  assert.equal(auth.consumeAuthReturnTo(), '/settings?network=base-sepolia#profile');
  assert.equal(auth.consumeAuthReturnTo(), '/');
});

test('late protected responses and token resolutions cannot expire or update a replacement identity', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  h.authenticate();
  const request = h.client.apiRequest('/user', { user: true });
  await new Promise(resolve => setImmediate(resolve));
  h.client.setApiUserId('did:privy:replacement');
  h.client.setBaseAuthentication({ userId: 'did:privy:replacement', getAccessToken: async () => 'new', onExpired: () => assert.fail('New identity expired') });
  release(response({ name: 'Old' }));
  await assert.rejects(request, error => error.name === 'AbortError');
  assert.equal(h.expired.length, 0);
  const token = harness();
  token.authenticate(() => new Promise(resolve => { release = resolve; }));
  const pending = token.client.apiRequest('/user', { user: true });
  token.client.setBaseAuthentication(null); token.client.setApiUserId(null);
  release('old-token');
  await assert.rejects(pending, error => error.name === 'AbortError');
  assert.equal(token.calls.length, 0); assert.equal(token.expired.length, 0);
});

test('headers, provider identities, and config caches remain separate on chain/environment changes', async () => {
  const h = harness((_url, init) => response(init.headers['X-Chain'] === 'base' ? baseConfiguration : configuration));
  const config = h.load('lib/api/config.ts');
  await config.loadConfiguration();
  h.authenticate();
  await h.client.apiRequest('/user', { user: true });
  h.client.configureApiContext({ chain: 'base', network: 'public' });
  assert.equal(h.client.getApiUserId(), null);
  await config.loadConfiguration();
  await h.client.apiRequest('/launches');
  const mainnet = h.calls.at(-1).init.headers;
  assert.equal(mainnet['X-Network'], 'public');
  assert.equal(mainnet['X-Stellar-Network'], undefined);
  assert.equal(mainnet.Authorization, undefined);
  h.client.configureApiContext({ chain: 'stellar', network: 'testnet' });
  h.client.setApiUserId('42');
  await config.loadConfiguration();
  await h.client.apiRequest('/user', { user: true });
  const stellar = h.calls.at(-1).init.headers;
  assert.equal(stellar['X-Stellar-Network'], 'testnet');
  assert.equal(stellar['X-Network'], undefined);
  assert.equal(stellar.Authorization, undefined);
  assert.equal(stellar['X-User-Id'], '42');
});

test('protected Base requests get the latest SDK token, keep the full DID, and allow only one 401 retry', async () => {
  let responses = 0;
  const h = harness(() => response({}, ++responses === 1 ? 401 : 200));
  h.authenticate();
  await h.client.apiRequest('/user', { user: true });
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0].init.headers['X-User-Id'], DID);
  assert.equal(h.tokens.join(','), 'token-1,token-2');
  await h.client.apiRequest('/launches');
  assert.equal(h.calls.at(-1).init.headers.Authorization, undefined);
  assert.equal(h.calls.at(-1).init.headers['X-User-Id'], undefined);
  assert.equal(h.calls[0].init.redirect, 'error');
});

for (const status of [401, 403, 409, 413, 422, 503]) test(`Base preserves HTTP ${status} without fallback or inappropriate auth retry`, async () => {
  const h = harness(() => response({}, status)); h.authenticate();
  await assert.rejects(h.client.apiRequest('/user', { user: true }), e => e.status === status);
  assert.equal(h.calls.length, status === 401 ? 2 : 1);
  assert.equal(h.expired.length, status === 401 ? 1 : 0);
  assert.ok(h.calls.every(call => call.init.headers['X-Chain'] === 'base'));
});

test('DID mismatch, missing tokens, unsupported routes and conflicting network inputs fail closed', async () => {
  const h = harness(); h.authenticate();
  h.client.setApiUserId('other-id');
  await assert.rejects(h.client.apiRequest('/user', { user: true }), e => e.code === 'unauthenticated');
  h.client.setApiUserId('did:privy:different');
  await assert.rejects(h.client.apiRequest('/user', { user: true }), e => e.code === 'unauthenticated');
  h.authenticate(async () => null);
  await assert.rejects(h.client.apiRequest('/user', { user: true }), e => e.code === 'unauthenticated');
  for (const path of ['/stellar/account', '/user/score', '/connections', '/oauth/github', '/developers', '/policies', '//unrelated.example/user']) {
    await assert.rejects(h.client.apiRequest(path));
  }
  const data = new FormData(); data.set('network', 'public');
  for (const options of [{ network: 'public' }, { json: { network: 'public' } }, { formData: data }]) {
    await assert.rejects(h.client.apiRequest('/launches/prelaunch', options), /Conflicting/);
  }
  assert.equal(h.calls.length, 0);
});

test('a response from an old chain/network is ignored rather than updating the new context', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  const old = h.client.apiRequest('/launches');
  h.client.configureApiContext({ chain: 'base', network: 'public' });
  release(response({ old: true }));
  await assert.rejects(old, e => e.name === 'AbortError');
});

test('resolve, optional-avatar registration, status, session and profile reuse shared authenticated routes', async () => {
  const h = harness(url => response(url.endsWith('/config') ? baseConfiguration
    : url.endsWith('/auth/status') || url.endsWith('/auth/resolve') ? registered
      : url.endsWith('/auth/session') ? { identityId: 'identity-base', userId: DID }
        : { ...registered, addresses: [ADDRESS] }));
  h.authenticate();
  await h.load('lib/api/config.ts').loadConfiguration();
  const api = h.load('lib/api/auth.ts');
  assert.equal((await api.resolveAccount({ userId: DID, address: ADDRESS })).registered, true);
  assert.equal((await api.registerAccount({ address: ADDRESS, name: ' Alice ' })).name, 'Alice');
  const registration = h.calls.find(call => call.url.endsWith('/auth/register'));
  assert.equal(JSON.parse(registration.init.body).name, 'Alice');
  assert.equal(registration.init.headers.Authorization.startsWith('Bearer '), true);
  assert.equal((await api.getRegistrationStatus()).userId, DID);
  assert.equal((await api.getSession()).identityId, 'identity-base');
  await api.getProfile();
  assert.ok(h.calls.filter(call => !call.url.endsWith('/config')).every(call => call.init.headers['X-User-Id'] === DID && call.init.headers.Authorization));
});

test('unregistered is not a failed Privy login; status rejects mismatched DIDs', async () => {
  const h = harness(() => response({ registered: false, userId: DID }));
  h.authenticate();
  const api = h.load('lib/api/auth.ts');
  assert.equal((await api.resolveAccount({ userId: DID, address: ADDRESS })).registered, false);
  h.client.setApiUserId('did:privy:another');
  await assert.rejects(api.getRegistrationStatus());
});

test('multipart registration and uploads preserve boundaries, server limits, and Base context', async () => {
  const h = harness(url => response(url.endsWith('/config') ? baseConfiguration : { ...registered, addresses: [ADDRESS] }));
  h.authenticate(); await h.load('lib/api/config.ts').loadConfiguration();
  await h.load('lib/api/auth.ts').registerAccount({ address: ADDRESS, name: 'Alice', avatar: new File(['image'], 'avatar.png', { type: 'image/png' }) });
  const call = h.calls.at(-1);
  assert.equal(call.init.body instanceof FormData, true);
  assert.equal(call.init.body.get('userId'), DID);
  assert.equal(call.init.headers['Content-Type'], undefined);
  assert.equal(call.init.headers['X-Network'], 'testnet');
});

test('Base list decodes verified event/receipt coverage without a chain discriminator on each launch', async () => {
  const list = {
    launches: [], page: 1, limit: 20, total: 0, sort: 'newest', direction: 'desc',
    dateMeaning: 'contract_creation', statsAsOf: DATE, statsSince: DATE, statsCoverage: 'verified_receipts_and_events',
  };
  const h = harness(url => response(url.endsWith('/config') ? baseConfiguration : list));
  await h.load('lib/api/config.ts').loadConfiguration();
  const market = h.load('lib/api/launches/market.ts');
  assert.equal((await market.getLaunchList('testnet', 1, 20)).statsCoverage, 'verified_receipts_and_events');
  assert.equal(market.launchListKey('testnet')[1].chain, 'base');
  const addresses = h.load('lib/chain-address.ts');
  assert.equal(addresses.isContractAddress(ADDRESS), true);
  assert.equal(addresses.isWalletAddress('G' + 'A'.repeat(55)), false);
  assert.equal(addresses.routeNetwork('public'), 'base-mainnet');
  assert.equal(addresses.explorerUrl(ADDRESS, 'testnet'), 'https://sepolia.basescan.org/address/' + ADDRESS);
  assert.equal(addresses.explorerUrl(HASH, 'public', true), 'https://basescan.org/tx/' + HASH);
});

test('Base holders show transfer coverage and deduplicate wallet casing', async () => {
  const result = { network: 'testnet', contractId: ADDRESS, asset: ADDRESS, amountScale: 7,
    balanceSource: 'token_contract', coverage: 'indexed_trades_and_transfers', totalHolders: 1, nextCursor: null,
    items: [{ address: ADDRESS, balance: '100000000000000000001', observedAt: DATE }] };
  const h = harness(url => response(url.endsWith('/config') ? baseConfiguration : result));
  await h.load('lib/api/config.ts').loadConfiguration();
  const holders = h.load('lib/api/launches/holders.ts');
  assert.equal((await holders.getHolders('project', 'testnet')).coverage, 'indexed_trades_and_transfers');
  assert.equal(holders.appendHolders(result.items, [{ ...result.items[0], address: ADDRESS.toUpperCase().replace('0X', '0x') }]).length, 1);
});

test('202/503 preserve the original hash, chain and identity; one receipt can report multiple trades', async () => {
  let status = 202;
  const h = harness(() => response({ trade, trades: [trade, { ...trade, side: 'sell' }], pair: ADDRESS, amountScale: 7, priceScale: 7 }, status, '2'));
  h.authenticate();
  const queue = h.load('lib/api/launches/trade-queue.ts');
  queue.enqueueTrade('testnet', ADDRESS, HASH, ADDRESS, 'project');
  const drain = () => queue.flushTradeQueue({ network: 'testnet', contractId: ADDRESS, slug: 'project', traderAddress: ADDRESS, signal: new AbortController().signal, onRecorded() {} });
  await drain();
  assert.equal(queue.readTradeQueue()[0].chain, 'base');
  assert.equal(queue.readTradeQueue()[0].transactionHash, HASH);
  assert.ok(queue.readTradeQueue()[0].nextAttemptAt > Date.now());
  for (status of [503, 200]) {
    for (const [key, value] of h.storage) h.storage.set(key, JSON.stringify({ ...JSON.parse(value), nextAttemptAt: 0 }));
    await drain();
  }
  assert.equal(queue.readTradeQueue().length, 0);
  assert.equal(h.calls.length, 3);
  assert.ok(h.calls.every(call => JSON.parse(call.init.body).transactionHash === HASH));
  const reported = await h.load('lib/api/launches/market.ts').recordTrade('project', 'testnet', HASH);
  assert.equal(reported.trades.length, 2); // The compatibility trade is not appended twice.
  queue.enqueueTrade('testnet', ADDRESS, HASH, ADDRESS, 'project');
  h.client.configureApiContext({ chain: 'base', network: 'public' });
  await drain();
  assert.equal(h.calls.length, 4);
  assert.equal(queue.readTradeQueue().length, 1);
});

test('linked wallets include smart accounts, reject unrelated wallets, and verify actual chain switching', async () => {
  const h = harness(), wallet = h.load('lib/base/wallet.ts');
  const linked = wallet.linkedEvmAddresses([{ type: 'smart_wallet', address: ADDRESS }, { type: 'wallet', address: 'invalid' }]);
  assert.equal(linked.length, 1);
  assert.equal(wallet.selectLinkedWallet([{ address: '0x' + 'f'.repeat(40) }], linked), undefined);
  assert.equal(wallet.isEvmTransactionHash(HASH), true);
  assert.equal(wallet.isEvmTransactionHash(HASH.slice(2)), false);
  let chain = 1, switches = 0;
  const connected = { getChainId: async () => chain, switchChain: async id => { switches++; chain = id; } };
  await wallet.ensureBaseWalletNetwork(connected, 'testnet');
  assert.equal(chain, 84532); assert.equal(switches, 1);
  await wallet.ensureBaseWalletNetwork(connected, 'public'); assert.equal(chain, 8453);
  connected.switchChain = async () => {};
  await assert.rejects(wallet.ensureBaseWalletNetwork(connected, 'testnet'), /Signing is blocked/);
  connected.switchChain = async () => { throw new Error('Rejected'); };
  await assert.rejects(wallet.ensureBaseWalletNetwork(connected, 'testnet'), /Rejected/);
});

test('only empty code or an exact EIP-7702 designator can originate ordinary transactions', () => {
  const { canOriginateBaseTransaction } = harness().load('lib/base/wallet.ts');
  for (const code of [null, undefined, '0x', '0xef0100' + 'a'.repeat(40), '0xEF0100' + 'A'.repeat(40)]) assert.equal(canOriginateBaseTransaction(code), true);
  for (const code of ['', '0x1234', '0xef0100', '0xef0100' + 'a'.repeat(42), '0xef0101' + 'a'.repeat(40), '0xef0100' + 'z'.repeat(40)]) assert.equal(canOriginateBaseTransaction(code), false);
});

test('Base per-token decimals, uint256 prices and operation boundaries are exact', () => {
  const h = harness(), amounts = h.load('lib/base/amount.ts');
  for (const decimals of [0, 6, 7, 8, 18]) {
    assert.equal(amounts.parseBaseAmount('9007199254740993', decimals), 9007199254740993n * 10n ** BigInt(decimals));
    amounts.requireBaseTokenDecimals(decimals);
    assert.throws(() => amounts.parseBaseAmount('1.' + '0'.repeat(decimals) + '1', decimals), /decimal places/);
  }
  assert.equal(amounts.parseBaseAmount('2.5', 6), 2500000n);
  assert.equal(amounts.formatBaseAmount(1000000000000000000n, 18), '1');
  assert.equal(amounts.formatBaseAmount(1000769n, 6), '1.000769');
  assert.equal(amounts.baseExecutionPrice(20100000n - 100000n, 1000000000000000000n, 18), 20000000n);
  assert.equal(amounts.sellableBaseBalance(100n, 0n), 0n);
  assert.equal(amounts.parseBaseAmount('9'.repeat(50), 0), BigInt('9'.repeat(50)));
  for (const input of ['0', '-1', '1e18']) assert.throws(() => amounts.parseBaseAmount(input, 18));
  const deployment = h.load('lib/base/deployment.ts');
  assert.throws(() => deployment.requireBaseWrites('trading', 'public'), /Mainnet/);
  assert.doesNotThrow(() => deployment.requireBaseWrites('creation', 'testnet'));
  assert.throws(() => deployment.requireBaseWrites('creation', 'public'), /Mainnet/);
  assert.doesNotThrow(() => deployment.requireBaseWrites('trading', 'testnet'));
});

test('combined discovery config selects Base auth once, allows null global scales, and retains Stellar auth', async () => {
  const base = structuredClone(baseConfiguration);
  base.rules.launches.amountScale = null; base.rules.launches.priceScale = null;
  const combined = { ...configuration, base };
  const h = harness(() => response(combined)), api = h.load('lib/api/config.ts');
  assert.equal((await api.loadConfiguration()).auth.appId, 'public-privy-app');
  assert.equal(api.decodeConfiguration(combined, 'stellar').auth.appId, configuration.auth.appId);
  assert.equal(api.decodeConfiguration(combined, 'base').rules.launches.amountScale, null);
  base.auth.appId = '';
  assert.equal(api.decodeConfiguration({ ...configuration, base }, 'base').auth.appId, '');
  assert.throws(() => api.decodeConfiguration({ ...base, rules: { ...base.rules, launches: { ...base.rules.launches, amountScale: 7 } } }), /amountScale/);
});
test('Base shared decoders retain mixed scales, zero decimals, long prices and uint256 indices', () => {
  const h = harness(), market = h.load('lib/api/launches/market.ts');
  const price = '9'.repeat(50);
  const launch = { network: 'testnet', factoryContractId: ADDRESS, factoryIndex: '900719925474099312345', slug: 'token-suffix', contractId: ADDRESS,
    owner: ADDRESS, asset: ADDRESS, pair: ADDRESS, assetDecimals: 18, pairDecimals: 6, metadata: { name: 'Token', symbol: 'TOK', description: '', logo: '' }, config: {}, state: {}, bonding: null,
    asOfLedger: 1, observedAt: DATE, createdAt: DATE, creationLedger: 1, creationTransactionHash: HASH, stateAsOfLedger: 1, stateObservedAt: DATE };
  assert.equal(market.decodeLaunch(launch).factoryIndex, launch.factoryIndex);
  assert.equal(market.decodeLaunch({ ...launch, assetDecimals: 0 }).assetDecimals, 0);
  const decoded = market.decodeTrades({ items: [{ ...trade, executionPrice: price }], nextCursor: null, pair: ADDRESS, amountScale: 18, priceScale: 6 });
  assert.equal(decoded.items[0].executionPrice, price); assert.equal(decoded.amountScale, 18); assert.equal(decoded.priceScale, 6);
  assert.equal(market.decodeTrades({ items: [], nextCursor: null, pair: ADDRESS, amountScale: 0, priceScale: 0 }).amountScale, 0);
  const display = h.load('lib/api/launches/display.ts');
  assert.equal(display.displayAmount('1000000000000000000', undefined, 18), '1');
  assert.equal(display.displayAmount('2500000', undefined, 6), '2.5');
  assert.equal(display.displayAmount('1', undefined, 0), '1');
  assert.equal(display.displayAmount('100000000', undefined, null), '—');
  assert.equal(display.compactAmount('2500000', 6), '2.5');
  assert.equal(display.assetScale({ assetDecimals: 0 }), 0);
  assert.equal(display.pairScale({}), null);
  assert.equal(display.chartNumber('1000769', 6), 1.000769);
});

test('Base Create preview uses exact 18-decimal draft supply and never invents pair contract units', async () => {
  const h = harness(() => response(baseConfiguration)); await h.load('lib/api/config.ts').loadConfiguration();
  const { initialLaunchDraft, validSupply } = h.load('features/create-launch/lib/launch-draft.ts');
  const { calculateDraftLaunch } = h.load('features/create-launch/lib/calculate-launch.ts');
  const draft = structuredClone(initialLaunchDraft); draft.supply = '100000000.000000000000000001';
  const preview = calculateDraftLaunch(draft);
  assert.equal(preview.assetDecimals, 18); assert.equal(validSupply(draft.supply), true);
  assert.equal(BigInt(preview.tokenUnits.curve) + BigInt(preview.tokenUnits.pool) + BigInt(preview.tokenUnits.team), 100000000000000000000000001n);
  assert.match(preview.contract.virtual_quote_reserve, /pair decimals/);
  assert.equal(validSupply('1.0000000000000000001'), false);
});

test('a repaired Base slug recovers by persisted contract identity in the original context', async () => {
  const indexed = { network: 'testnet', factoryContractId: ADDRESS, factoryIndex: '1', slug: 'token-repaired', contractId: ADDRESS,
    owner: ADDRESS, asset: ADDRESS, pair: ADDRESS, assetDecimals: 18, pairDecimals: 6, metadata: { name: 'Token', symbol: 'TOK', description: '', logo: '' }, config: {}, state: {}, bonding: null,
    asOfLedger: 1, observedAt: DATE, createdAt: DATE, creationLedger: 1, creationTransactionHash: HASH, stateAsOfLedger: 1, stateObservedAt: DATE,
    category: 'bonding-curve', amountScale: 18, volume24h: { grossPairAmount: '0', assetAmount: '0', tradeCount: 0, buyCount: 0, sellCount: 0 } };
  const h = harness(url => url.includes('/config') ? response(baseConfiguration)
    : url.includes('/token-old/trades') ? response({}, 404)
      : url.includes('/token-repaired/trades') ? response({ trade, trades: [trade], pair: ADDRESS, amountScale: 18, priceScale: 6 })
        : response({ launches: [indexed], total: 1, page: 1, limit: 20, sort: 'newest', direction: 'desc', dateMeaning: 'contract_creation', statsAsOf: DATE, statsSince: DATE, statsCoverage: 'verified_receipts_and_events' }));
  h.authenticate(); await h.load('lib/api/config.ts').loadConfiguration();
  const queue = h.load('lib/api/launches/trade-queue.ts'); queue.enqueueTrade('testnet', ADDRESS, HASH, ADDRESS, 'token-old');
  let recorded = 0;
  await queue.flushTradeQueue({ network: 'testnet', contractId: ADDRESS, traderAddress: ADDRESS, slug: 'token-old', signal: new AbortController().signal, onRecorded: () => recorded++ });
  assert.equal(recorded, 1); assert.equal(queue.readTradeQueue().length, 0);
  assert.ok(h.calls.some(call => call.url.includes('/token-repaired/trades')));
  for (const call of h.calls) assert.equal(call.init.headers['X-Chain'], 'base');
});
