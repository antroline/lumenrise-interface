import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

const require = createRequire(import.meta.url),
  directory = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(directory, '../../..');
const ID = 'CD63E3VCNGZGC66ZUTCZDV2YLIBMMFOIFESPM25J5REMU7VM6LNF4B7X';
const OWNER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const ASSET = 'CAWK7TNWJW3EYE5FMHF2AWKCSPYF5FA6ERSEPTKU7VAK7VWA64OJTENK';
const PAIR = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
const DATE = '2026-10-12T12:00:00Z';
const common = {
  network: 'testnet',
  contractId: ID,
  asset: ASSET,
  pair: PAIR,
  amountScale: 7,
  priceScale: 7,
};
const launch = {
  ...common,
  factoryContractId: 'factory',
  factoryIndex: 1,
  owner: OWNER,
  metadata: {
    name: 'Token',
    symbol: 'TOK',
    description: '<script>unsafe</script>',
    logo: 'https://assets.example/token.png',
  },
  config: {},
  state: {},
  asOfLedger: 1,
  observedAt: DATE,
  stateAsOfLedger: 2,
  stateObservedAt: DATE,
  bonding: null,
};
const trade = {
  trader: OWNER,
  tradedAt: DATE,
  asset: ASSET,
  side: 'buy',
  assetAmount: '9223372036854775807',
  executionPrice: '10000001',
};
const recorded = { trade, pair: PAIR, amountScale: 7, priceScale: 7 };
const market = {
  ...common,
  currentPrice: null,
  priceObservedAt: null,
  priceType: 'marginal_before_fee',
  stateAsOfLedger: 2,
  stateObservedAt: DATE,
  stateStale: true,
  curveReserve: '0',
  netTokensSold: '0',
  distinctBuyers: 3,
  volume24h: {
    grossPairAmount: '12345678901234567',
    assetAmount: '10',
    tradeCount: 2,
    buyCount: 1,
    sellCount: 1,
  },
};
const chart = {
  ...common,
  range: '1D',
  intervalSeconds: 300,
  priceType: 'marginal_before_fee',
  firstObservationAt: DATE,
  lastObservationAt: DATE,
  previousPrice: null,
  interpolation: 'step',
  items: [],
};
const same = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
function load(filename, globals, cache = new Map()) {
  const path = resolve(directory, filename);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  runInNewContext(
    output,
    {
      module,
      exports: module.exports,
      URL,
      URLSearchParams,
      AbortController,
      DOMException,
      FormData,
      Date,
      Error,
      JSON,
      Event,
      setTimeout,
      clearTimeout,
      console,
      require: (name) =>
        name.startsWith('.')
          ? load(resolve(dirname(path), `${name}.ts`), globals, cache)
          : name.startsWith('@/')
            ? load(resolve(sourceRoot, `${name.slice(2)}.ts`), globals, cache)
            : require(name),
      ...globals,
    },
    { filename: path },
  );
  return module.exports;
}
function storage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (key) => values.delete(key),
  };
}
function harness(handler = () => ({ result: recorded }), store = storage()) {
  const calls = [],
    state = { handler },
    cache = new Map();
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const r = await state.handler(url, init);
    if (r instanceof Error) throw r;
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name) => (name === 'Retry-After' ? (r.retryAfter ?? null) : null),
      },
      text: async () =>
        JSON.stringify({
          status:
            status === 202 ? 'pending' : status >= 400 ? 'error' : 'success',
          message: 'Test response',
          result: r.result,
        }),
    };
  };
  const globals = {
    fetch,
    localStorage: store,
    navigator: {},
    window: { dispatchEvent() {} },
  };
  const client = load('../client.ts', globals, cache),
    api = load('market.ts', globals, cache),
    queue = load('trade-queue.ts', globals, cache),
    display = load('display.ts', globals, cache);
  client.configureApi('http://api.example/v1');
  client.setApiUserId('42');
  return {
    client,
    api,
    queue,
    display,
    calls,
    globals,
    setHandler: (handler) => {
      state.handler = handler;
    },
    reload: () => harness(state.handler, store),
  };
}
const drain = (h) =>
  h.queue.flushTradeQueue({
    network: 'testnet',
    contractId: ID,
    traderAddress: OWNER,
    signal: new AbortController().signal,
    onRecorded() {},
  });

test('all public GETs carry explicit network and no account header; list uses page and limit', async () => {
  const h = harness((url) => ({
    result: url.includes('/market?')
      ? market
      : url.includes('/chart?')
        ? chart
        : url.includes('/trades?')
          ? { items: [trade], nextCursor: 'opaque/+==', ...common }
          : url.includes('/launches?')
            ? { launches: [launch], page: 2, limit: 20, total: 41 }
            : launch,
  }));
  await h.api.getLaunchList('testnet', 2, 20, OWNER);
  await h.api.getLaunchDetail(ID, 'testnet');
  await h.api.getMarket(ID, 'testnet');
  await h.api.getChart(ID, 'testnet', '1D');
  await h.api.getTrades(ID, 'testnet', {
    cursor: 'opaque/+==',
    trader: OWNER,
    side: 'sell',
  });
  for (const c of h.calls) {
    assert.equal(new URL(c.url).searchParams.get('network'), 'testnet');
    assert.equal(c.init.headers['X-User-Id'], undefined);
    assert.equal(new URL(c.url).searchParams.has('kind'), false);
  }
  const list = new URL(h.calls[0].url);
  assert.equal(list.searchParams.get('page'), '2');
  assert.equal(list.searchParams.get('owner'), OWNER);
  assert.equal(
    new URL(h.calls[4].url).searchParams.get('cursor'),
    'opaque/+==',
  );
});
test('decoders retain null, exact large amounts and six trade fields', () => {
  const h = harness();
  assert.equal(h.api.decodeLaunch(launch).bonding, null);
  assert.equal(h.api.decodeMarket(market).currentPrice, null);
  assert.equal(
    h.display.displayAmount(trade.assetAmount),
    '922337203685.4775807',
  );
  same(
    Object.keys(
      h.api.decodeTrade({ ...trade, transactionHash: 'not-in-contract' }),
    ),
    ['trader', 'tradedAt', 'asset', 'side', 'assetAmount', 'executionPrice'],
  );
  assert.throws(() => h.api.decodeMarket({ ...market, priceScale: 0 }));
  assert.throws(() => h.api.decodeChart({ ...chart, interpolation: 'linear' }));
});
test('detail rejects another launch or network instead of poisoning its cache', async () => {
  const h = harness(() => ({ result: { ...launch, network: 'public' } }));
  await assert.rejects(
    h.api.getLaunchDetail(ID, 'testnet'),
    (e) => e.code === 'invalid-response',
  );
});
test('chart uses close at lastObservedAt and carries previous prices without zero buckets', () => {
  const h = harness(),
    now = Date.parse(DATE);
  const item = {
    timestamp: '2026-10-12T11:55:00Z',
    open: '10000000',
    close: '20000000',
    high: '20000000',
    low: '10000000',
    count: 1,
    firstObservedAt: '2026-10-12T11:56:00Z',
    lastObservedAt: '2026-10-12T11:59:00Z',
  };
  const points = h.display.chartPoints(
    { ...chart, previousPrice: '10000000', items: [item] },
    now,
  );
  assert.equal(points[0].price, 1);
  assert.equal(points[1].time, Date.parse(item.lastObservedAt));
  assert.equal(points[1].price, 2);
  assert.equal(points.at(-1).price, 2);
  assert.equal(h.display.chartPoints(chart, now).length, 0);
  assert.equal(
    h.display.chartPoints({ ...chart, previousPrice: '50000000' }, now).length,
    2,
  );
  assert.throws(
    () => h.display.chartNumber('9223372036854775807', 7),
    /precision/,
  );
});
test('trade POST sends exactly the hash and provider user id, never the wallet', async () => {
  const h = harness();
  await h.api.recordTrade(ID, 'testnet', 'hash');
  same(JSON.parse(h.calls[0].init.body), { transactionHash: 'hash' });
  assert.equal(h.calls[0].init.headers['X-User-Id'], '42');
  h.client.setApiUserId(null);
  await assert.rejects(
    h.api.recordTrade(ID, 'testnet', 'hash'),
    (e) => e.code === 'unauthenticated',
  );
  assert.equal(h.calls.length, 1);
});
test('queue survives reload, retains several hashes and deduplicates resubmission', async () => {
  const h = harness();
  h.queue.enqueueTrade('testnet', ID, 'one', OWNER);
  h.queue.enqueueTrade('testnet', ID, 'two', OWNER);
  h.queue.enqueueTrade('testnet', ID, 'one', OWNER);
  assert.equal(h.queue.readTradeQueue().length, 2);
  const reloaded = h.reload();
  let refreshes = 0;
  await reloaded.queue.flushTradeQueue({
    network: 'testnet',
    contractId: ID,
    traderAddress: OWNER,
    signal: new AbortController().signal,
    onRecorded() {
      refreshes++;
    },
  });
  assert.equal(reloaded.calls.length, 2);
  assert.equal(refreshes, 2);
  assert.equal(reloaded.queue.readTradeQueue().length, 0);
});
for (const status of [202, 503, 404])
  test(`${status} retains the same hash and respects Retry-After`, async () => {
    const h = harness(() => ({ status, retryAfter: '120' }));
    h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
    await drain(h);
    const [record] = h.queue.readTradeQueue();
    assert.equal(record.state, 'pending');
    assert.ok(record.nextAttemptAt > Date.now() + 119000);
    await drain(h);
    assert.equal(h.calls.length, 1);
    same(JSON.parse(h.calls[0].init.body), { transactionHash: 'hash' });
  });
test('network failures retain hash with capped backoff', async () => {
  const h = harness(() => new Error('Offline'));
  h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
  await drain(h);
  assert.equal(h.queue.readTradeQueue()[0].state, 'pending');
  assert.equal(h.queue.retryDelay(new Error('Offline'), 100), 300000);
});
test('Retry-After HTTP dates are honored and a non-200 success cannot drain the hash', async () => {
  const h = harness(() => ({
    status: 503,
    retryAfter: new Date(Date.now() + 120000).toUTCString(),
  }));
  h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
  await drain(h);
  assert.ok(h.queue.readTradeQueue()[0].nextAttemptAt > Date.now() + 118000);
  const other = harness(() => ({ status: 201, result: recorded }));
  other.queue.enqueueTrade('testnet', ID, 'uncompleted', OWNER);
  await drain(other);
  assert.equal(other.queue.readTradeQueue().length, 1);
});
for (const status of [400, 401, 403])
  test(`${status} stops automatic retry without deleting the durable hash`, async () => {
    const h = harness(() => ({ status }));
    h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
    await drain(h);
    await drain(h);
    assert.equal(h.calls.length, 1);
    assert.equal(
      h.queue.readTradeQueue()[0].state,
      status === 400 ? 'invalid' : 'identity',
    );
    const reload = h.reload();
    await drain(reload);
    assert.equal(reload.calls.length, 0);
  });
test('missing identity preserves hashes, then recovers with the matching current identity', async () => {
  const h = harness();
  h.client.setApiUserId(null);
  h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
  await drain(h);
  assert.equal(h.calls.length, 0);
  h.client.setApiUserId('42');
  await drain(h);
  assert.equal(h.calls.length, 1);
  assert.equal(h.queue.readTradeQueue().length, 0);
});
test('queue never sends a hash for another wallet, user, network, launch or API origin', async () => {
  const h = harness();
  h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
  h.queue.enqueueTrade('public', ID, 'public', OWNER);
  h.queue.enqueueTrade('testnet', 'another', 'other-launch', OWNER);
  h.client.setApiUserId('99');
  await drain(h);
  assert.equal(h.calls.length, 0);
  h.client.setApiUserId('42');
  h.client.configureApi('http://another.example');
  await drain(h);
  assert.equal(h.calls.length, 0);
  h.client.configureApi('http://api.example/v1');
  await h.queue.flushTradeQueue({
    network: 'testnet',
    contractId: ID,
    traderAddress: 'another-wallet',
    signal: new AbortController().signal,
    onRecorded() {},
  });
  assert.equal(h.calls.length, 0);
  await drain(h);
  assert.equal(h.calls.length, 1);
  assert.equal(h.queue.readTradeQueue().length, 2);
});
test('only one POST per hash can be in flight and unmount abort preserves it', async () => {
  let resolveRequest;
  const h = harness(
    () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
  );
  h.queue.enqueueTrade('testnet', ID, 'hash', OWNER);
  const first = drain(h);
  await drain(h);
  assert.equal(h.calls.length, 1);
  resolveRequest({ result: recorded });
  await first;
  h.setHandler(
    (_url, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        ),
      ),
  );
  h.queue.enqueueTrade('testnet', ID, 'second', OWNER);
  const controller = new AbortController(),
    flushing = h.queue.flushTradeQueue({
      network: 'testnet',
      contractId: ID,
      traderAddress: OWNER,
      signal: controller.signal,
      onRecorded() {},
    });
  controller.abort();
  await flushing;
  assert.equal(h.queue.readTradeQueue()[0].transactionHash, 'second');
});
test('current TanStack cache deduplicates reads, isolates ranges and invalidates one launch only', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let resolveRequest,
    calls = 0;
  const key = ['launch', 'testnet', ID, 'chart', '1D'];
  const options = {
    queryKey: key,
    queryFn: () => {
      calls++;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    },
  };
  const first = client.fetchQuery(options),
    duplicate = client.fetchQuery(options);
  assert.equal(calls, 1);
  client.setQueryData(['launch', 'testnet', ID, 'chart', '1W'], 'weekly');
  client.setQueryData(['launch', 'public', ID, 'market'], 'public');
  resolveRequest('daily');
  await Promise.all([first, duplicate]);
  assert.equal(
    client.getQueryData(['launch', 'testnet', ID, 'chart', '1W']),
    'weekly',
  );
  await client.invalidateQueries({
    queryKey: ['launch', 'testnet', ID],
    refetchType: 'none',
  });
  assert.equal(
    client.getQueryState(['launch', 'public', ID, 'market']).isInvalidated,
    false,
  );
  client.clear();
});
test('unmount cancellation also aborts a response body after HTTP headers arrived', async () => {
  let started;
  const bodyStarted = new Promise(resolve => { started = resolve; });
  const fetch = async (_url, init) => ({
    ok: true, status: 200, headers: { get: () => null },
    text: () => { started(); return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))); },
  });
  const client = load('../client.ts', { fetch });
  const controller = new AbortController();
  const aborted = assert.rejects(client.apiRequest('/launches', { signal: controller.signal }), error => error.name === 'AbortError');
  await bodyStarted;
  controller.abort();
  await aborted;
});
