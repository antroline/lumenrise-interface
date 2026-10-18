import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

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
const candle = {
  timestamp: '2026-10-12T11:00:00Z', endsAt: DATE,
  open: '10000001', close: null, latestPrice: '20000001',
  high: '20000001', low: '10000001', complete: false, partial: true,
  count: 1, firstObservedAt: null, lastObservedAt: null,
};
const frame = { timeframe: '15m', timezone: 'UTC', items: [], hasMore: false, nextBefore: null };
const chart = {
  ...common,
  priceType: 'marginal_before_fee',
  asOf: DATE,
  firstObservationAt: null,
  lastObservationAt: null,
  timeframes: [frame],
};
const same = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
function load(filename, globals, cache = new Map()) {
  const path = resolve(directory, filename);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
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
    display = load('display.ts', globals, cache),
    holders = load('holders.ts', globals, cache),
    topTraders = load('top-traders.ts', globals, cache);
  client.configureApi('http://api.example/v1');
  client.setApiUserId('42');
  return {
    client,
    api,
    queue,
    display,
    holders,
    topTraders,
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
  assert.throws(() => h.api.decodeChart({ ...chart, timeframes: [{ ...frame, timezone: 'local' }] }));
});
test('detail rejects another launch or network instead of poisoning its cache', async () => {
  const h = harness(() => ({ result: { ...launch, network: 'public' } }));
  await assert.rejects(
    h.api.getLaunchDetail(ID, 'testnet'),
    (e) => e.code === 'invalid-response',
  );
});
test('chart preserves UTC timestamps, deduplicates, scales, and uses latestPrice for null close', () => {
  const h = harness();
  const early = { ...candle, timestamp: '2026-10-12T10:00:00Z', close: '12345678' };
  const history = { ...chart, from: null, items: [candle, early, candle] };
  const points = h.display.chartPoints(history);
  assert.equal(points.length, 2);
  assert.equal(points[0].time, Date.parse(early.timestamp));
  assert.equal(points[0].price, 1.2345678);
  assert.equal(points[1].time, Date.parse(candle.timestamp));
  assert.equal(points[1].price, 2.0000001);
  assert.equal(h.display.chartPoints({ ...history, items: [] }).length, 0);
  same(h.display.chartWindow(history), [Date.parse(early.timestamp), Date.parse(DATE)]);
  same(h.display.chartWindow({ ...history, from: '2026-10-12T10:30:00Z' }),
    [Date.parse('2026-10-12T10:30:00Z'), Date.parse(DATE)]);
  assert.throws(() => h.display.chartNumber('9'.repeat(400), 7));
  assert.equal(h.display.chartNumber('9223372036854775807', 7), Number('922337203685.4775807'));
});

test('all five ranges request the specified timeframe and rolling/calendar bounds without legacy range or initial to', async () => {
  const reference = Date.parse('2024-03-31T12:34:56.789Z');
  const expected = [
    ['1D', '15m', '2024-03-30T12:34:56.789Z'],
    ['1W', '4h', '2024-03-24T12:34:56.789Z'],
    ['1M', '1d', '2024-02-29T12:34:56.789Z'],
    ['3M', '1w', '2023-12-31T12:34:56.789Z'],
    ['ALL', '1d', null],
  ];
  const h = harness(url => ({ result: { ...chart, timeframes: [{ ...frame, timeframe: new URL(url).searchParams.get('timeframes') }] } }));
  for (const [range, timeframe, from] of expected) {
    await h.api.getChart(ID, 'testnet', range, undefined, reference);
    const url = new URL(h.calls.at(-1).url);
    assert.equal(url.pathname, `/v1/launches/${ID}/chart`);
    assert.equal(url.searchParams.get('timeframes'), timeframe);
    assert.equal(url.searchParams.get('from'), from);
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.has('range'), false);
    assert.equal(url.searchParams.has('to'), false);
    assert.equal(h.calls.at(-1).init.body, undefined);
  }
  assert.equal(h.api.chartFrom('1M', Date.parse('2023-03-31T23:00:00Z')), '2023-02-28T23:00:00.000Z');
  assert.equal(h.api.chartFrom('3M', Date.parse('2026-05-31T01:00:00Z')), '2026-02-28T01:00:00.000Z');
});

test('ALL paginates daily candles, preserves initial asOf, sorts and deduplicates boundaries', async () => {
  const boundary = '2026-10-11T00:00:00+00:00';
  const olderCandle = { ...candle, timestamp: '2026-10-10T00:00:00Z' };
  const h = harness(url => ({ result: {
    ...chart,
    asOf: new URL(url).searchParams.has('to') ? boundary : DATE,
    timeframes: [{ ...frame, timeframe: '1d',
      items: new URL(url).searchParams.has('to') ? [olderCandle, { ...candle, latestPrice: '0' }] : [candle],
      hasMore: !new URL(url).searchParams.has('to'),
      nextBefore: new URL(url).searchParams.has('to') ? null : boundary,
    }],
  } }));
  const history = await h.api.getChart(ID, 'testnet', 'ALL');
  assert.equal(h.calls.length, 2);
  assert.equal(new URL(h.calls[1].url).searchParams.get('to'), boundary);
  assert.equal(new URL(h.calls[1].url).searchParams.has('from'), false);
  assert.equal(history.asOf, DATE);
  assert.equal(history.items.length, 2);
  assert.equal(history.items[0].timestamp, olderCandle.timestamp);
  assert.equal(history.items[1].latestPrice, candle.latestPrice);
});

test('ALL rejects stuck/missing cursors and older-page failures instead of returning partial history', async () => {
  for (const nextBefore of [null, DATE]) {
    const h = harness(() => ({ result: { ...chart, timeframes: [{ ...frame, timeframe: '1d', hasMore: true, nextBefore }] } }));
    await assert.rejects(h.api.getChart(ID, 'testnet', 'ALL'), /pagination/);
  }
  const h = harness(url => new URL(url).searchParams.has('to')
    ? { status: 503 }
    : { result: { ...chart, timeframes: [{ ...frame, timeframe: '1d', hasMore: true, nextBefore: '2026-10-11T00:00:00Z' }] } });
  await assert.rejects(h.api.getChart(ID, 'testnet', 'ALL'), e => e.status === 503);
  assert.equal(h.calls.length, 2);
});

test('ALL cancellation stops pagination and invalid response identities/timeframes are rejected', async () => {
  const controller = new AbortController();
  const h = harness(() => {
    controller.abort();
    return { result: { ...chart, timeframes: [{ ...frame, timeframe: '1d', hasMore: true, nextBefore: '2026-10-11T00:00:00Z' }] } };
  });
  await assert.rejects(h.api.getChart(ID, 'testnet', 'ALL', controller.signal));
  assert.equal(h.calls.length, 1);
  for (const result of [{ ...chart, network: 'public' }, { ...chart, contractId: ASSET }, { ...chart, timeframes: [] }]) {
    const other = harness(() => ({ result }));
    await assert.rejects(other.api.getChart(ID, 'testnet', '1D'), e => e.code === 'invalid-response');
  }
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


test('pair labels identify configured Testnet USDC without relabeling other assets', () => {
  const { display } = harness();
  assert.equal(display.pairLabel(PAIR, 'testnet'), 'USDC');
  assert.equal(display.pairLabel(PAIR, 'public'), 'CBIE…DAMA');
  assert.equal(display.pairLabel(ASSET, 'testnet'), 'CAWK…TENK');
});


test('compact token amounts retain exact rounding and promote suffixes at boundaries', () => {
  const { compactAmount } = harness().display;
  for (const [raw, expected] of [
    [null, '—'], ['0', '0'], ['123456789', '12.35'],
    ['100000000000', '10K'], ['125678900000', '12.57K'],
    ['10000000000000', '1M'], ['10000000000000000', '1B'],
    ['10000000000000000000', '1T'], ['9999990000', '1K'],
    ['9999990000000', '1M'], ['-125678900000', '-12.57K'],
    ['-1', '0'], ['9007199254740993', '900.72M'],
  ]) assert.equal(compactAmount(raw), expected);
});

const holderResult = {
  network: 'testnet', contractId: ID, asset: ASSET, amountScale: 7,
  balanceSource: 'token_contract', coverage: 'trade_participants',
  totalHolders: 42, nextCursor: 'opaque/+==',
  items: [{ address: OWNER, balance: '9007199254740993', observedAt: DATE }],
};

test('holders unwrap the public response, preserve opaque cursors and use the launch contract', async () => {
  const h = harness(() => ({ result: holderResult }));
  same(await h.holders.getHolders(ID, 'testnet'), holderResult);
  assert.equal(h.calls[0].url, `http://api.example/v1/launches/${ID}/holders?network=testnet&limit=20`);
  assert.equal(h.calls[0].init.headers['X-User-Id'], undefined);
  assert.equal(h.calls[0].init.body, undefined);
  await h.holders.getHolders(ID, 'testnet', { cursor: holderResult.nextCursor });
  assert.equal(new URL(h.calls[1].url).searchParams.get('cursor'), holderResult.nextCursor);
  h.client.configureApi('http://api.example');
  h.setHandler(() => ({ result: { ...holderResult, network: 'public' } }));
  await h.holders.getHolders(ID, 'public');
  assert.equal(h.calls[2].url, `http://api.example/v1/launches/${ID}/holders?network=public&limit=20`);
});

test('holder balances remain exact above MAX_SAFE_INTEGER and appended rows retain server order', () => {
  const { formatHolderBalance, appendHolders } = harness().holders;
  for (const [raw, expected] of [
    ['0', '0'], ['1', '0.0000001'], ['123456789', '12.3456789'],
    ['9007199254740993', '900719925.4740993'],
    ['9223372036854775807', '922337203685.4775807'],
  ]) assert.equal(formatHolderBalance(raw, 7), expected);
  const second = { address: ID, balance: '1', observedAt: DATE };
  same(appendHolders(holderResult.items, [...holderResult.items, second, second]), [...holderResult.items, second]);
});

test('holders accept empty results and contract holders, reject invalid requests and malformed responses', async () => {
  const h = harness(() => ({ result: { ...holderResult, items: [], totalHolders: 0, nextCursor: null } }));
  assert.equal((await h.holders.getHolders(ID, 'testnet')).totalHolders, 0);
  h.setHandler(() => ({ result: { ...holderResult, items: [{ ...holderResult.items[0], address: ID }] } }));
  assert.equal((await h.holders.getHolders(ID, 'testnet')).items[0].address, ID);
  for (const [id, network, limit] of [[OWNER, 'testnet', 20], [ID, 'mainnet', 20], [ID, 'public', 0], [ID, 'testnet', 101]]) {
    await assert.rejects(h.holders.getHolders(id, network, { limit }), (e) => e.status === 400);
  }
  assert.equal(h.calls.length, 2);
  for (const patch of [{ contractId: ASSET }, { network: 'public' }, { amountScale: 6 }, { items: [{ ...holderResult.items[0], balance: 42 }] }]) {
    h.setHandler(() => ({ result: { ...holderResult, ...patch } }));
    await assert.rejects(h.holders.getHolders(ID, 'testnet'), (e) => e.code === 'invalid-response');
  }
});

test('holder HTTP failures are errors rather than zero counts', async () => {
  for (const status of [400, 404, 503]) {
    const h = harness(() => ({ status, result: {} }));
    await assert.rejects(h.holders.getHolders(ID, 'testnet'), (e) => e.status === status);
  }
});

test('recorded trades invalidate this launch’s holders while allowing delayed balance updates', async () => {
  let snapshot = holderResult;
  const h = harness((url) => ({ result: url.includes('/holders?') ? snapshot : recorded }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const key = ['launch', 'testnet', ID, 'holders', 20];
  const observer = new QueryObserver(client, {
    queryKey: key, queryFn: ({ signal }) => h.holders.getHolders(ID, 'testnet', {}, signal),
  });
  const unsubscribe = observer.subscribe(() => {});
  await observer.refetch();
  client.setQueryData(['launch', 'public', ID, 'holders', 20], 'other network');
  h.queue.enqueueTrade('testnet', ID, 'holder-trade', OWNER);
  await h.queue.flushTradeQueue({
    network: 'testnet', contractId: ID, traderAddress: OWNER,
    signal: new AbortController().signal,
    onRecorded: () => client.invalidateQueries({ queryKey: ['launch', 'testnet', ID] }),
  });
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data.items[0].balance, holderResult.items[0].balance);
  assert.equal(client.getQueryData(['launch', 'public', ID, 'holders', 20]), 'other network');
  snapshot = { ...holderResult, items: [{ ...holderResult.items[0], balance: '10000000' }] };
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data.items[0].balance, '10000000');
  unsubscribe();
  client.clear();
});

test('holders lifecycle scopes pages, blocks duplicate loads, resets on refresh and cancels old pages', { timeout: 15_000 }, async () => {
  const h = harness(() => ({ result: { ...holderResult, nextCursor: null,
    items: [...holderResult.items, { address: ID, balance: '1', observedAt: DATE }] } }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const states = [], refs = [], effects = [];
  let stateIndex, refIndex, effectIndex, options;
  let query = { data: holderResult, isFetching: false };
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = value; }];
    },
    useRef(initial) {
      const index = refIndex++;
      return refs[index] ??= { current: initial };
    },
    useEffect(fn, deps) {
      const index = effectIndex++;
      const previous = effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.();
        effects[index] = { deps, fn, pending: true };
      }
    },
  };
  const hook = load('../../../features/launches/hooks/use-holders.ts', {
    require: (name) => name === 'react' ? react
      : name === '@tanstack/react-query' ? {
        useQuery: (value) => { options = value; return query; }, useQueryClient: () => client,
      } : name === './queries' ? {
        launchKey: (network, id) => ['launch', network, id],
        publicQueryOptions: { retry: false }, usePageVisible: () => true,
      } : name === '../../../lib/api/launches/holders' ? h.holders : require(name),
  });
  function render(id = ID, network = 'testnet', active = true) {
    stateIndex = refIndex = effectIndex = 0;
    const result = hook.useHolders(id, network, active);
    for (const effect of effects) if (effect.pending) {
      effect.pending = false;
      effect.cleanup = effect.fn();
    }
    return result;
  }
  let result = render();
  same(options.queryKey, ['launch', 'testnet', ID, 'holders', 20]);
  assert.equal(options.refetchInterval, 60_000);
  await Promise.all([result.loadMore(), result.loadMore()]);
  result = render();
  assert.equal(h.calls.length, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.cursor, null);
  assert.equal(result.query.data.totalHolders, 42);
  query = { data: { ...holderResult }, isFetching: false };
  result = render();
  assert.equal(result.items.length, 1, 'Refresh replaces appended pages');
  assert.equal(result.cursor, holderResult.nextCursor);
  query = { data: undefined, isFetching: true };
  result = render(ASSET, 'public', false);
  assert.equal(result.items.length, 0, 'No previous launch/network rows while loading');
  assert.equal(result.cursor, undefined);
  same(options.queryKey, ['launch', 'public', ASSET, 'holders', 20]);
  assert.equal(options.refetchInterval, false);

  query = { data: holderResult, isFetching: false };
  result = render();
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  h.setHandler((_url, init) => new Promise((_resolve, reject) => {
    started();
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const pending = result.loadMore();
  assert.equal(states[1], true, 'A page request started');
  await ready;
  query = { data: undefined, isFetching: true };
  result = render(ASSET, 'public');
  await pending;
  result = render(ASSET, 'public');
  assert.equal(result.items.length, 0);
  assert.equal(result.pageError, undefined);
  for (const effect of effects) effect.cleanup?.();
  client.clear();
});

test('holder UI distinguishes loading, empty, failures and populated balances with retry/load-more actions', () => {
  const jsx = (type, props) => ({ type, props });
  const { IndexedHolders } = load('../../../features/launches/trading/indexed-holders.tsx', {
    require: (name) => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === '@/lib/api/launches/holders' ? harness().holders
      : name === './trade-table-style' ? { tradeTableClass: 'existing-table' }
      : Object.fromEntries(['Blockie', 'Button', 'Empty', 'EmptyHeader', 'EmptyTitle', 'EmptyDescription',
        'Skeleton', 'Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow'].map((key) => [key, key])),
  });
  const refetch = () => {}, loadMore = () => {};
  const base = { query: { data: holderResult, isPending: false, isError: false,
    isFetching: false, refetch }, items: holderResult.items, cursor: holderResult.nextCursor,
    pending: false, loadMore };
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [value];
    return [value, ...nodes(value.props?.children)];
  }
  for (const [patch, expected] of [
    [{ query: { ...base.query, data: undefined, isPending: true } }, 'Loading holders'],
    [{ items: [], cursor: null, query: { ...base.query, data: { ...holderResult, items: [], totalHolders: 0 } } }, 'No holder data available yet'],
    [{ query: { ...base.query, data: undefined, isError: true, error: new Error('Launch not found') } }, 'Could not load holders'],
  ]) {
    const tree = nodes(IndexedHolders({ holders: { ...base, ...patch }, ticker: 'TOK' }));
    assert.ok(tree.some((node) => node === expected || node?.props?.['aria-label'] === expected));
  }
  const populated = nodes(IndexedHolders({ holders: base, ticker: 'TOK' }));
  assert.ok(populated.includes('900719925.4740993'));
  assert.ok(!populated.some((node) => typeof node === 'string' && node.includes('known holders.')));
  assert.ok(!populated.some((node) => node?.type === 'Button' && node.props.children === 'Refresh'));
  assert.ok(populated.some((node) => node?.props?.content === OWNER));
  assert.ok(populated.some((node) => node?.type === 'Button' && node.props.children === 'Load more'));
  const failedPage = nodes(IndexedHolders({ holders: { ...base, pageError: new Error('Temporarily unavailable') }, ticker: 'TOK' }));
  assert.ok(failedPage.some((node) => node?.props?.role === 'alert'));
  assert.ok(failedPage.some((node) => node?.type === 'Button' && node.props.children === 'Retry'));
});

test('price history keeps its chart styling and range wiring, with loading/empty/error/retry states in the container', () => {
  const h = harness();
  const jsx = (type, props) => ({ type, props });
  let selected = '1D', options;
  let query = { isPending: true, isError: false, refetch() {} };
  const { IndexedPriceChart } = load('../../../features/launches/trading/indexed-price-chart.tsx', {
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === 'react' ? { useState: initial => [typeof initial === 'string' ? selected : initial, value => { selected = value; }], useEffect() {}, useRef: () => ({ current: null }) }
      : name === '@tanstack/react-query' ? { useQuery: value => { options = value; return query; }, useQueryClient: () => ({}) }
      : name === '@/lib/api/launches/market' ? h.api
      : name === '@/lib/api/launches/display' ? h.display
      : name === '@/features/launches/hooks/queries' ? { launchKey: (network, id) => ['launch', network, id], publicQueryOptions: {}, usePageVisible: () => true }
      : Object.fromEntries(['LineChart', 'PriceChart', 'Skeleton', 'Button', 'Empty', 'EmptyHeader', 'EmptyTitle', 'EmptyDescription'].map(key => [key, key])),
  });
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [value];
    return [value, ...nodes(value.props?.children)];
  }
  const render = (address = ID, network = 'testnet') => {
    const tree = nodes(IndexedPriceChart({ address, network, ticker: 'TOK', pair: 'XLM', price: '2 XLM' }));
    const wrapper = tree.find(node => node?.type === 'PriceChart');
    assert.equal(wrapper.props.quoteSymbol, 'XLM');
    return [wrapper, nodes(wrapper.props.history.content)];
  };
  assert.ok(render()[1].some(node => node?.type === 'Skeleton'));
  query = { ...query, isPending: false, isError: true, error: new Error('Temporarily unavailable') };
  assert.ok(render()[1].includes('Could not load price history'));
  assert.ok(render()[1].some(node => node?.type === 'Button' && node.props.children === 'Retry'));
  query = { ...query, isError: false, data: { ...chart, items: [], from: null } };
  assert.ok(render()[1].includes('Price history not available yet'));
  query = { ...query, data: { ...chart, items: [candle], from: '2026-10-11T12:00:00Z' } };
  const line = render()[1].find(node => node?.type === 'LineChart');
  assert.equal(line.props.interpolation, 'step');
  assert.equal(line.props.fill, false);
  assert.equal(line.props.marker, false);
  assert.equal(line.props.height, 240);
  assert.equal(line.props.axisWidth, 90);
  assert.equal(line.props.className, '[&_.stroke-foreground]:stroke-lime [&_line]:stroke-transparent [&_text]:fill-muted-foreground');
  same(line.props.timestamps, [Date.parse(candle.timestamp)]);
  assert.equal(line.props.stepEndTime, Math.min(Date.parse(candle.endsAt), Date.parse(chart.asOf)));
  for (const range of ['1D', '1W', '1M', '3M', 'ALL']) {
    render()[0].props.history.onRangeChange(range);
    render(ASSET, 'public');
    same(options.queryKey.slice(0, 6), ['launch', 'public', ASSET, 'chart', range, h.api.chartTimeframes[range]]);
  }
  query = { ...query, isError: true };
  assert.ok(render()[1].some(node => node?.props?.role === 'alert'));
});

test('switching chart range, launch and network cancels the old request and cannot replace active data', async () => {
  let started, aborted = false;
  const ready = new Promise(resolve => { started = resolve; });
  const h = harness((url, init) => {
    const params = new URL(url).searchParams;
    if (params.get('timeframes') === '15m') return new Promise((_resolve, reject) => {
      started();
      init.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); });
    });
    return { result: { ...chart, contractId: ASSET, network: 'public', timeframes: [{ ...frame, timeframe: '4h', items: [candle] }] } };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const observer = new QueryObserver(client, {
    queryKey: ['launch', 'testnet', ID, 'chart', '1D', '15m'],
    queryFn: ({ signal }) => h.api.getChart(ID, 'testnet', '1D', signal),
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await ready;
    const completed = new Promise(resolve => {
      const stop = observer.subscribe(result => { if (result.isSuccess) { stop(); resolve(result.data); } });
    });
    observer.setOptions({
      queryKey: ['launch', 'public', ASSET, 'chart', '1W', '4h'],
      queryFn: ({ signal }) => h.api.getChart(ASSET, 'public', '1W', signal),
    });
    const active = await completed;
    assert.equal(aborted, true);
    assert.equal(active.network, 'public');
    assert.equal(active.contractId, ASSET);
    assert.equal(observer.getCurrentResult().data, active);
    assert.equal(client.getQueryData(['launch', 'testnet', ID, 'chart', '1D', '15m']), undefined);
  } finally { unsubscribe(); client.clear(); }
});

test('final candle renders through server asOf without changing samples or extending past its end', () => {
  const jsx = (type, props) => ({ type, props });
  const { LineChart } = load('../../../components/charts.tsx', {
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === 'react' ? { useId: () => 'test-chart' }
      : name === '@/lib/chart' ? load('../../chart.ts', {})
      : name === '@/lib/utils' ? { cn: (...values) => values.filter(Boolean).join(' ') }
      : require(name),
  });
  const first = Date.parse('2026-10-15T00:15:00Z');
  const second = Date.parse('2026-10-15T00:30:00Z');
  const start = Date.parse('2026-10-15T00:29:46.742Z');
  const asOf = Date.parse('2026-10-15T00:43:08.628Z');
  const data = [0.0000008, 0.0000008];
  const timestamps = [first, second];
  const base = { data, timestamps, timeDomain: [start, asOf], width: 680, axisWidth: 90,
    height: 240, min: 0, max: 0.0000016, interpolation: 'step', fill: false, marker: false, label: 'Observed prices' };
  const path = patch => {
    const svg = LineChart({ ...base, ...patch });
    return svg.props.children.find(node => node?.type === 'path').props.d;
  };
  const withoutEnd = path({});
  assert.ok(!withoutEnd.endsWith('L590.0 112.0'));
  assert.ok(path({ stepEndTime: asOf }).endsWith('L590.0 112.0'), 'The latest candle reaches server now');
  assert.ok(path({ stepEndTime: asOf + 60000 }).endsWith('L590.0 112.0'), 'The visible window clips future candle geometry');
  assert.equal(path({ stepEndTime: second }), withoutEnd, 'No backwards extension');
  assert.ok(path({ stepEndTime: second + 60000 }) !== path({ stepEndTime: asOf }), 'A finished candle stops at its actual end');
  assert.ok(path({ data: [data[1]], timestamps: [second], stepEndTime: asOf }).includes(' L'), 'A single candle has a visible duration');
  assert.equal(path({ interpolation: 'linear', stepEndTime: asOf }), path({ interpolation: 'linear' }), 'Other chart interpolation is unchanged');
  same(data, [0.0000008, 0.0000008]);
  same(timestamps, [first, second]);
});

test('top traders reads every page, combines buys and sells and ranks the top ten by exact estimated volume', async () => {
  const cursor = 'older/+==';
  const rows = Array.from({ length: 12 }, (_, index) => ({ ...trade, trader: `trader-${index}`, assetAmount: String((index + 1) * 10000000), executionPrice: '10000000' }));
  const h = harness(url => ({ result: { ...common,
    items: new URL(url).searchParams.has('cursor')
      ? [{ ...trade, trader: 'trader-0', side: 'sell', assetAmount: '9007199254740993', executionPrice: '20000000' }]
      : rows,
    nextCursor: new URL(url).searchParams.has('cursor') ? null : cursor,
  } }));
  const result = await h.topTraders.getTopTraders(ID, 'testnet');
  assert.equal(h.calls.length, 2);
  assert.equal(new URL(h.calls[1].url).searchParams.get('cursor'), cursor);
  assert.equal(new URL(h.calls[0].url).searchParams.get('limit'), '100');
  assert.equal(new URL(h.calls[0].url).searchParams.has('side'), false);
  assert.equal(h.calls[0].init.headers['X-User-Id'], undefined);
  assert.equal(result.items.length, 10);
  const leader = result.items[0];
  assert.equal(leader.trader, 'trader-0');
  assert.equal(leader.tradeCount, 2);
  assert.equal(leader.buyVolume, '10000000');
  assert.equal(leader.sellVolume, (9007199254740993n * 2n).toString());
  assert.equal(leader.volume, (9007199254740993n * 2n + 10000000n).toString());
  assert.equal(result.items[1].trader, 'trader-11');
  assert.equal(result.pair, PAIR);
});

test('top traders preserves sub-stroop contributions until total conversion and accepts empty history', async () => {
  const h = harness(() => ({ result: { ...common, items: [
    { ...trade, assetAmount: '5000000', executionPrice: '1' },
    { ...trade, assetAmount: '5000000', executionPrice: '1' },
  ], nextCursor: null } }));
  assert.equal((await h.topTraders.getTopTraders(ID, 'testnet')).items[0].volume, '1');
  h.setHandler(() => ({ result: { ...common, items: [], nextCursor: null } }));
  assert.equal((await h.topTraders.getTopTraders(ID, 'public')).items.length, 0);
  assert.equal(new URL(h.calls.at(-1).url).searchParams.get('network'), 'public');
});

test('top traders rejects partial history failures, repeated cursors and currency changes', async () => {
  for (const failure of ['http', 'cursor', 'pair']) {
    const h = harness(url => {
      const older = new URL(url).searchParams.has('cursor');
      return failure === 'http' && older ? { status: 503 }
        : { result: { ...common, pair: failure === 'pair' && older ? ASSET : PAIR,
          items: [trade], nextCursor: failure === 'cursor' || !older ? 'older' : null } };
    });
    await assert.rejects(h.topTraders.getTopTraders(ID, 'testnet'));
    assert.equal(h.calls.length, 2);
  }
  const controller = new AbortController();
  const h = harness(() => {
    controller.abort();
    return { result: { ...common, items: [trade], nextCursor: 'older' } };
  });
  await assert.rejects(h.topTraders.getTopTraders(ID, 'testnet', controller.signal));
  assert.equal(h.calls.length, 1);
});

test('top traders table shows loading, empty, error and ranked data with retry and scoped queries', () => {
  const h = harness(), jsx = (type, props) => ({ type, props });
  let query = { isPending: true, isError: false, refetch() {} }, options;
  const { IndexedTopTraders } = load('../../../features/launches/trading/indexed-top-traders.tsx', {
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === 'react' ? { useEffect() {} }
      : name === '@tanstack/react-query' ? { useQuery: value => { options = value; return query; }, useQueryClient: () => ({}) }
      : name === '@/lib/api/launches/top-traders' ? h.topTraders
      : name === '@/lib/api/launches/display' ? h.display
      : name === '@/features/launches/hooks/queries' ? { launchKey: (network, id) => ['launch', network, id], publicQueryOptions: { refetchInterval: 60000 }, usePageVisible: () => true }
      : name === './trade-table-style' ? { tradeTableClass: 'existing-table' }
      : Object.fromEntries(['Blockie', 'Button', 'Skeleton', 'Empty', 'EmptyHeader', 'EmptyTitle', 'EmptyDescription', 'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell'].map(key => [key, key])),
  });
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [value];
    return [value, ...nodes(value.props?.children)];
  }
  const render = (address = ID, network = 'testnet') => nodes(IndexedTopTraders({ address, network, pair: 'USDC' }));
  assert.ok(render().some(node => node?.props?.['aria-label'] === 'Loading top traders'));
  query = { ...query, isPending: false, isError: true, error: new Error('Unavailable') };
  assert.ok(render().includes('Could not load top traders'));
  assert.ok(render().some(node => node?.type === 'Button' && node.props.children === 'Retry'));
  query = { ...query, isError: false, data: { items: [] } };
  assert.ok(render().includes('No recorded traders yet'));
  query = { ...query, data: { pair: PAIR, items: [{ trader: OWNER, buyVolume: '12345678', sellVolume: '20000000', volume: '32345678', tradeCount: 2 }] } };
  const rows = render();
  assert.ok(rows.includes('3.235'));
  assert.ok(rows.includes('Volume · USDC ≈'));
  assert.ok(rows.some(node => node?.props?.title === OWNER));
  render(ASSET, 'public');
  same(options.queryKey, ['launch', 'public', ASSET, 'top-traders', 'all', 10]);
  query = { ...query, isError: true };
  assert.ok(render().some(node => node?.props?.role === 'alert'));
});

test('launch decoder preserves optional project links without requiring them on existing launches', () => {
  const h = harness();
  const metadata = { ...launch.metadata, website: 'https://project.example', xAccount: 'https://x.com/project', github: 'https://github.com/project' };
  const decoded = h.api.decodeLaunch({ ...launch, metadata }).metadata;
  assert.equal(decoded.website, metadata.website);
  assert.equal(decoded.xAccount, metadata.xAccount);
  assert.equal(decoded.github, metadata.github);
  assert.equal(h.api.decodeLaunch(launch).metadata.website, undefined);
});

test('trade header displays available project links next to Share and omits the options menu', async () => {
  const jsx = (type, props) => ({ type, props });
  const { TradeHeaderActions } = load('../../../features/launches/trading/trade-header-actions.tsx', {
    window: { location: { href: 'https://app.example/trade/token' } },
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
      : name === 'lucide-react' ? { Globe: 'Globe', Share2: 'Share2' }
      : name === '@/components/brand-icons' ? { GithubIcon: 'GithubIcon', XLogoIcon: 'XLogoIcon' }
      : Object.fromEntries(['Button', 'TradeTooltip', 'TradeCopyFeedback'].map(key => [key, key])),
  });
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [value];
    return [value, ...nodes(value.props?.children)];
  }
  const copied = [];
  const copy = async (...args) => { copied.push(args); };
  const empty = nodes(TradeHeaderActions({ copy }));
  assert.equal(empty.filter(node => node?.type === 'Button').length, 1);
  const all = nodes(TradeHeaderActions({ copy, links: {
    website: 'https://project.example', x: 'https://x.com/project', github: 'https://github.com/project',
  } }));
  const buttons = all.filter(node => node?.type === 'Button');
  same(buttons.map(node => node.props['aria-label']), ['Copy token page link', 'Project Website', 'Project X', 'Project GitHub']);
  for (const button of buttons.slice(1)) {
    assert.equal(button.props.nativeButton, false);
    assert.equal(button.props.render.type, 'a');
    assert.equal(button.props.render.props.target, '_blank');
    assert.equal(button.props.render.props.rel, 'noopener noreferrer');
  }
  buttons[0].props.onClick();
  same(copied, [['https://app.example/trade/token', 'Link']]);
  const invalid = nodes(TradeHeaderActions({ copy, links: { website: 'javascript:alert(1)', x: 'invalid', github: 'https://user:pass@github.com/project' } }));
  assert.equal(invalid.filter(node => node?.type === 'Button').length, 1);
});
