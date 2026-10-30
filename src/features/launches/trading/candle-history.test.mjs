import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configurationModule } from '../../../configuration-fixture.mjs';

const require = createRequire(import.meta.url);
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
function load(file, mocks = {}, globals = {}, cache = new Map()) {
  const path = resolve(directory, file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(source, { exports, URLSearchParams, AbortController, Date, Error, console, setTimeout, clearTimeout,
    require: name => mocks[name] ?? (name.endsWith('/config') ? configurationModule
      : name.startsWith('@/') ? load(resolve(root, name.slice(2) + '.ts'), mocks, globals, cache)
      : name.startsWith('.') ? load(resolve(dirname(path), name + '.ts'), mocks, globals, cache) : require(name)), ...globals }, { filename: path });
  return exports;
}
const NOW = Date.parse('2026-10-28T12:00:00Z');
function candle(time, patch = {}) {
  return { timestamp: new Date(time).toISOString(), endsAt: new Date(time + 60000).toISOString(), open: '1000000000000000000', high: '2000000000000000000', low: '1000000000000000000', close: null, latestPrice: '1500000000000000000', complete: false, partial: false, count: 0, firstObservedAt: null, lastObservedAt: null, ...patch };
}
function page(items, patch = {}) {
  return { result: { network: 'testnet', contractId: 'market', asset: 'token', pair: 'pair', priceScale: 18, amountScale: 7,
    priceType: 'marginal_before_fee', firstObservationAt: null, lastObservationAt: null, asOf: new Date(NOW).toISOString(), ...patch.result },
    frame: { timeframe: '1m', timezone: 'UTC', items, hasMore: false, nextBefore: null, ...patch.frame } };
}
const helpers = load('./candle-history.ts');
test('all supported identifiers, UTC Monday weeks and true calendar periods', () => {
  assert.equal(helpers.candleTimeframes.join(','), '1m,5m,15m,45m,1h,4h,1d,1w,1M,3M,6M,1y');
  assert.equal(new Date(helpers.candleBoundary(NOW, '1w')).toISOString(), '2026-10-26T00:00:00.000Z');
  assert.equal(new Date(helpers.candleBoundary(NOW, '1M')).toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(new Date(helpers.candleBoundary(NOW, '3M')).toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(new Date(helpers.candleBoundary(NOW, '6M')).toISOString(), '2026-07-01T00:00:00.000Z');
  assert.equal(new Date(helpers.candleBoundary(NOW, '1y')).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(new Date(helpers.earlierBoundary(NOW, '3M', 3)).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(new Date(helpers.earlierBoundary(NOW, '6M', 1)).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(new Date(helpers.earlierBoundary(NOW, '1y', 1)).toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(helpers.candleBoundary(NOW, '1m'), NOW);
  for (const [frame, minutes] of [['5m', 5], ['15m', 15], ['45m', 45], ['1h', 60], ['4h', 240], ['1d', 1440]])
    assert.equal(helpers.candleBoundary(NOW + 59234, frame) % (minutes * 60000), 0);
  assert.equal(new Date(helpers.displayWindow('1M', Date.parse('2024-03-31T23:59:59Z'))[0]).toISOString(), '2024-02-29T23:59:59.000Z');
  assert.equal(new Date(helpers.displayWindow('3M', Date.parse('2026-05-31T12:00:00Z'))[0]).toISOString(), '2026-02-28T12:00:00.000Z');
  assert.equal(helpers.displayWindow('ALL', NOW), undefined);
});
test('precise percentages, no negative zero, invalid baselines and partial daily history', () => {
  assert.equal(helpers.percentage('100000000000000000001', '100000000000000000000'), '0.00%');
  assert.equal(helpers.percentage('99999999999999999999', '100000000000000000000'), '0.00%');
  assert.equal(helpers.percentage('125', '100'), '+25.00%');
  assert.equal(helpers.percentage('75', '100'), '-25.00%');
  assert.equal(helpers.percentage('75', '0'), null);
  const day = helpers.candleBoundary(NOW, '1d');
  const previous = candle(day - 86400000, { complete: true, close: '100' });
  const current = candle(day, { latestPrice: '125' });
  assert.equal(helpers.dailyPercentage(page([current, previous])), '+25.00%');
  for (const patch of [{ partial: true }, { complete: false }, { close: null }, { close: '0' }])
    assert.equal(helpers.dailyPercentage(page([current, { ...previous, ...patch }])), null);
  assert.equal(helpers.dailyPercentage(page([current])), null);
  assert.equal(helpers.dailyPercentage(page([previous])), null);
});
test('snapshot merging deduplicates, sorts, preserves flat/partial bars and rejects obsolete corrections', () => {
  const store = new helpers.CandleStore();
  const old = candle(NOW - 60000, { complete: true, close: '110', partial: true });
  store.merge(page([candle(NOW), old]));
  store.merge(page([candle(NOW, { latestPrice: '175' })], { result: { asOf: new Date(NOW + 1000).toISOString() } }));
  store.merge(page([candle(NOW, { latestPrice: '1' })]));
  assert.equal(store.size, 2);
  assert.equal(store.items[0].partial, true);
  assert.equal(store.items[0].count, 0);
  assert.equal(store.items[1].latestPrice, '175');
  assert.equal(store.items[1].close, null);
  assert.throws(() => store.merge(page([], { result: { pair: 'another-pair' } })), /market/);
});
test('requests use explicit network and case-sensitive timeframe, overlap UTC boundary, never legacy range', async () => {
  const calls = [];
  const api = load('./candle-history.ts', { '@/lib/api/client': { getApiChain: () => 'stellar', apiRequest: async (url, options) => {
    calls.push({ url, options });
    const p = page([candle(NOW), candle(NOW - 60000), candle(NOW)]);
    return { ...p.result, timeframes: [{ ...p.frame, timeframe: new URLSearchParams(url.split('?')[1]).get('timeframes') }] };
  } } });
  for (const frame of api.candleTimeframes) {
    const data = await api.requestCandles('launch', 'testnet', frame, new AbortController().signal, { from: NOW - 5000, to: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(data.frame.items.length, 2);
    const call = calls.at(-1), query = new URLSearchParams(call.url.split('?')[1]);
    assert.equal(query.get('timeframes'), frame);
    assert.equal(query.get('range'), null);
    assert.equal(query.get('limit'), '1000');
    assert.ok(Date.parse(query.get('to')) <= Date.now());
    assert.equal(Date.parse(query.get('from')), api.candleBoundary(NOW - 5000, frame));
    assert.equal(call.options.network, 'testnet');
  }
});

function hookHarness(handler) {
  let now = NOW, index = 0, pending = [], slots = [], timers = new Map(), nextTimer = 0, listeners = new Map();
  let args = ['launch', 'testnet', '1m', NOW - 60000, true];
  const requests = [];
  const document = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const react = {
    useState: initial => { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = index++; return slots[i] ?? (slots[i] = { current: initial }); },
    useEffect: (fn, deps) => { const i = index++, old = slots[i]; if (!old || deps.some((dep, j) => dep !== old.deps[j])) {
      pending.push(() => { old?.cleanup?.(); slots[i] = { deps, setup: fn, cleanup: fn() }; });
    } },
  };
  const api = { ...helpers, requestCandles: async (...request) => { requests.push(request); return handler(...request, requests.length); } };
  const client = { getQueryCache: () => ({ subscribe: fn => { listeners.set('cache', fn); return () => listeners.delete('cache'); } }) };
  const module = load('./use-candle-history.ts', { react, '@tanstack/react-query': { useQueryClient: () => client }, './candle-history': api }, { document,
    Date: class extends Date { static now() { return now; } },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; }, clearTimeout: id => timers.delete(id) });
  const render = (patch = {}) => {
    args = args.map((value, i) => i in patch ? patch[i] : value); index = 0;
    const result = module.useCandleHistory(...args);
    const effects = pending; pending = []; effects.forEach(fn => fn());
    return result;
  };
  const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  return { render, requests, document, listeners, timers, flush,
    advance: async ms => { now += ms; const ready = [...timers.entries()].filter(([, timer]) => timer.at <= now); for (const [id, timer] of ready) { timers.delete(id); timer.fn(); } await flush(); },
    visibility: async hidden => { document.hidden = hidden; listeners.get('visibilitychange')?.(); await flush(); },
    cleanup: () => { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('bounded pagination loads more than 1000 candles and retains from/own cursor without duplicates', async () => {
  const bars = Array.from({ length: 1600 }, (_, i) => candle(NOW - (1599 - i) * 60000));
  const h = hookHarness(async (_slug, _network, frame, _signal, options) => {
    if (frame === '1d') return page([]);
    if (options.to) return page(bars.slice(0, 601), { frame: { hasMore: false } });
    return page(bars.slice(600), { frame: { hasMore: true, nextBefore: bars[600].timestamp } });
  });
  h.render({ 3: NOW - 1599 * 60000 }); await h.flush();
  const state = h.render();
  assert.equal(state.items.length, 1600);
  assert.equal(state.exhausted, true);
  const history = h.requests.find(call => call[4].to);
  assert.equal(history[4].to, bars[600].timestamp);
  assert.equal(history[4].from, NOW - 1599 * 60000);
  h.cleanup(); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
});
test('polls overlap the current tail, reconcile unfinished candles, preserve history and pause when hidden', async () => {
  let refresh = 0;
  const h = hookHarness(async (_slug, _network, frame) => {
    if (frame === '1d') return page([]);
    refresh++;
    return refresh === 1 ? page([candle(NOW - 60000), candle(NOW)])
      : page([candle(NOW, { complete: true, close: '160' }), candle(NOW + 60000)], { result: { asOf: new Date(NOW + 60000).toISOString() } });
  });
  h.render(); await h.flush(); await h.advance(15000);
  const state = h.render();
  assert.equal(state.items.length, 3);
  assert.equal(state.items[1].complete, true);
  assert.equal(state.items[1].close, '160');
  assert.equal(JSON.stringify(h.requests[2][4]), JSON.stringify({ limit: 8 }));
  await h.visibility(true); const count = h.requests.length; await h.advance(60000); assert.equal(h.requests.length, count);
  await h.visibility(false); assert.ok(h.requests.length > count);
  h.cleanup();
});
test('reconnect backfills before publishing the new tail and ignores aborted obsolete markets', async () => {
  let refresh = 0, resolveBridge;
  const h = hookHarness(async (_slug, _network, frame, signal, options) => {
    if (frame === '1d') return page([]);
    if (options.to) return new Promise(resolve => { resolveBridge = () => resolve(page([candle(NOW), candle(NOW + 60000)], { frame: { hasMore: false } })); });
    refresh++;
    return refresh === 1 ? page([candle(NOW)]) : page([candle(NOW + 120000)], { frame: { hasMore: true, nextBefore: new Date(NOW + 120000).toISOString() } });
  });
  h.render({ 3: NOW }); await h.flush(); await h.advance(15000);
  assert.equal(h.render().items.length, 1); // bridge is staged through its yielding turn
  resolveBridge(); await h.flush();
  assert.equal(h.render().items.length, 3);
  const oldSignal = h.requests[0][3];
  h.render({ 0: 'another-launch', 1: 'public', 2: '1M' });
  assert.equal(oldSignal.aborted, false); // each completed request owns its controller
  assert.equal(h.render().loading, true);
  await h.flush();
  h.cleanup(); assert.equal(h.timers.size, 0);
});
test('temporary refresh failures retain candles and retry with bounded backoff', async () => {
  let refresh = 0;
  const h = hookHarness(async (_slug, _network, frame) => {
    if (frame === '1d') return page([]);
    if (++refresh > 1) throw new Error('Offline');
    return page([candle(NOW)]);
  });
  h.render({ 3: NOW }); await h.flush(); await h.advance(15000);
  assert.equal(h.render().items.length, 1);
  assert.equal(h.render().error, 'Offline');
  const count = h.requests.length; await h.advance(2999); assert.equal(h.requests.length, count);
  await h.advance(1); assert.ok(h.requests.length > count);
  h.cleanup();
});


test('calendar panning boundaries and non-seven price scales stay chart-local', () => {
  assert.equal(new Date(helpers.earlierBoundary(Date.parse('2026-03-01T00:00:00Z'), '1M', 1)).toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(new Date(helpers.earlierBoundary(Date.parse('2026-03-02T00:00:00Z'), '1w', 1)).toISOString(), '2026-02-23T00:00:00.000Z');
  assert.equal(helpers.earlierBoundary(NOW, '1m', 100), NOW - 6000000);
  const p = page([]);
  assert.equal(helpers.decodeCandleResult({ ...p.result, timeframes: [p.frame] }).priceScale, 18);
  assert.throws(() => helpers.decodeCandleResult({ ...p.result, priceScale: -1, timeframes: [p.frame] }), /scale/);
});

test('pending obsolete requests are aborted and cannot replace a new market/timeframe session', async () => {
  let resolveOld;
  const h = hookHarness(async (slug, network, frame) => {
    if (slug === 'launch') return new Promise(resolve => { resolveOld = resolve; });
    return page([candle(NOW)], { result: { network }, frame: { timeframe: frame } });
  });
  h.render(); await h.flush(); const signal = h.requests[0][3];
  h.render({ 0: 'new-market', 1: 'public', 2: '1M' }); await h.flush();
  assert.equal(signal.aborted, true);
  resolveOld(page([candle(NOW - 60000)])); await h.flush();
  assert.equal(h.render().items.length, 1);
  assert.equal(h.render().result.network, 'public');
  h.cleanup(); assert.equal(h.listeners.size, 0); assert.equal(h.timers.size, 0);
});

test('All publishes bounded batches, allows interruption and reports remaining older pages honestly', async () => {
  let batches = 0;
  const h = hookHarness(async (_slug, _network, frame) => {
    if (frame === '1d') return page([]);
    const time = NOW - batches++ * 60000;
    return page([candle(time)], { frame: { hasMore: true, nextBefore: new Date(time).toISOString() } });
  });
  h.render({ 3: undefined }); await h.flush();
  assert.equal(batches, 4); // one snapshot plus three historical pages
  assert.equal(h.render().items.length, 4);
  assert.equal(h.render().exhausted, false);
  assert.equal(h.render().older, true);
  await h.advance(80); assert.equal(batches, 7);
  h.cleanup(); const count = h.requests.length; await h.advance(15000); assert.equal(h.requests.length, count);
});

test('library updates preserve historical zoom, compensate prepends, isolate hover and clean subscriptions', () => {
  let slots = [], hook = 0, effects = [], logical = { from: 0, to: 1 }, rangeListener, crosshair, removed = false;
  const areaCalls = [], candleCalls = [];
  const makeSeries = calls => ({ applyOptions() {}, options: () => ({ priceFormat: { type: 'custom' } }),
    setData: data => calls.push(['set', data]), update: (data, historical) => calls.push(['update', data, historical]) });
  const area = makeSeries(areaCalls), candles = makeSeries(candleCalls);
  const scale = {
    getVisibleLogicalRange: () => ({ ...logical }),
    setVisibleLogicalRange: range => { logical = { ...range }; rangeListener?.(logical); },
    setVisibleRange: () => { logical = { from: 0, to: 1 }; },
    getVisibleRange: () => ({ from: NOW / 1000 - 60, to: NOW / 1000 }),
    fitContent() {}, scrollToRealTime() {},
    subscribeVisibleLogicalRangeChange: fn => { rangeListener = fn; },
    unsubscribeVisibleLogicalRangeChange: () => { rangeListener = undefined; },
  };
  const chart = { addSeries: type => type === 'area' ? area : candles, applyOptions() {}, timeScale: () => scale,
    subscribeCrosshairMove: fn => { crosshair = fn; }, unsubscribeCrosshairMove: () => { crosshair = undefined; }, remove: () => { removed = true; } };
  const react = {
    useRef: initial => { const i = hook++; return slots[i] ?? (slots[i] = { current: i === 0 ? {} : initial }); },
    useState: initial => { const i = hook++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useId: () => 'chart-description',
    useEffect: (fn, deps) => { const i = hook++, old = slots[i]; if (!old || deps.some((value, j) => value !== old.deps[j])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, setup: fn, cleanup: fn() }; }); },
  };
  const jsx = (type, props) => ({ type, props });
  const component = load('./price-history-plot.tsx', { react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'lightweight-charts': { createChart: () => chart, AreaSeries: 'area', CandlestickSeries: 'candles', ColorType: { Solid: 0 }, CrosshairMode: { Normal: 0 }, LineStyle: { Dashed: 0 } },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/toggle-group': { ToggleGroup: 'ToggleGroup', ToggleGroupItem: 'ToggleGroupItem' },
    '@/components/ui/tooltip': { Tooltip: 'Tooltip', TooltipContent: 'TooltipContent', TooltipTrigger: 'TooltipTrigger' },
  }, { document: { createElement: () => ({ getContext: () => null }), documentElement: {} }, getComputedStyle: () => ({ getPropertyValue: () => '#000', fontFamily: 'sans-serif' }), MutationObserver: class { observe() {} disconnect() {} } });
  const point = (time, price) => ({ time, price, exactPrice: String(price), candle: { open: price, high: price, low: price, close: price, exact: `O ${price} · H ${price} · L ${price} · C ${price}`, status: 'Open' } });
  let props = { points: [point(NOW - 60000, 1), point(NOW, 2)], ticker: 'TOK', pair: 'XLM', following: false, preset: false, dailyChange: '+10.00%' };
  const render = patch => { props = { ...props, ...patch }; hook = 0; const tree = component.PriceHistoryPlot(props); const run = effects; effects = []; run.forEach(fn => fn()); return tree; };
  function nodes(value) { return !value || typeof value !== 'object' ? [value] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]; }
  render();
  logical = { from: 0.25, to: 1.25 };
  render({ points: [point(NOW - 60000, 1), point(NOW, 3), point(NOW + 60000, 4)] });
  assert.equal(areaCalls.filter(call => call[0] === 'set').length, 1);
  assert.equal(candleCalls.filter(call => call[0] === 'update').length, 2);
  assert.equal(logical.from, 0.25); assert.equal(logical.to, 1.25);
  render({ points: [point(NOW - 120000, 0.5), ...props.points] });
  assert.equal(logical.from, 1.25); assert.equal(logical.to, 2.25);
  assert.equal(areaCalls.filter(call => call[0] === 'set').length, 2);
  crosshair({ time: (NOW - 60000) / 1000 });
  assert.ok(nodes(render()).includes('+10.00%'));
  let manual = 0, earlier = 0;
  const tree = render({ onManualRange: () => { manual++; }, onNeedHistory: (_time, bars) => { earlier = bars; } });
  const canvas = nodes(tree).find(node => node?.props?.role === 'group');
  canvas.props.onPointerDown(); logical = { from: -50, to: -25 }; rangeListener(logical);
  assert.equal(manual, 1); assert.equal(earlier, 150);
  // React StrictMode replays effect setup after cleanup with refs preserved.
  const replay = slots.filter(slot => slot?.setup).map(slot => slot.setup);
  slots.forEach(slot => slot?.cleanup?.());
  replay.forEach(setup => setup());
  assert.equal(areaCalls.filter(call => call[0] === 'set').length, 3);
  slots.forEach(slot => slot?.cleanup?.());
  assert.equal(removed, true); assert.equal(rangeListener, undefined); assert.equal(crosshair, undefined);
});

test('interval switches retain a separate display snapshot until replacement arrives without mixing candle stores', async () => {
  let release;
  const h = hookHarness(async (_slug, _network, frame) => {
    if (frame === '1d') return page([]);
    if (frame === '4h') return new Promise(resolve => { release = resolve; });
    return page([candle(NOW)]);
  });
  h.render({ 3: NOW }); await h.flush();
  const waiting = h.render({ 2: '4h' });
  assert.equal(waiting.loading, true);
  assert.equal(waiting.items.length, 0);
  assert.equal(waiting.previous.items.length, 1);
  assert.equal(waiting.previous.timeframe, '1m');
  release(page([candle(NOW - 3600000)], { frame: { timeframe: '4h' } }));
  await h.flush();
  const replacement = h.render();
  assert.equal(replacement.previous, undefined);
  assert.equal(replacement.items.length, 1);
  assert.equal(replacement.items[0].timestamp, new Date(NOW - 3600000).toISOString());
  const anotherMarket = h.render({ 0: 'another-market', 2: '4h' });
  assert.equal(anotherMarket.previous, undefined);
  h.cleanup();
});

test('refreshes candles every three seconds and immediately after scoped trade invalidation', async () => {
  const h = hookHarness(async () => page([candle(NOW)]));
  h.render({ 3: NOW }); await h.flush();
  const count = h.requests.length;
  await h.advance(2999); assert.equal(h.requests.length, count);
  await h.advance(1); assert.ok(h.requests.length > count);
  const polled = h.requests.length;
  h.listeners.get('cache')({ type: 'updated', action: { type: 'invalidate' }, query: { queryKey: ['launch', 'stellar', 'public', 'other'] } });
  await h.flush(); assert.equal(h.requests.length, polled);
  h.listeners.get('cache')({ type: 'updated', action: { type: 'invalidate' }, query: { queryKey: ['launch', 'stellar', 'testnet', 'launch'] } });
  await h.flush(); assert.ok(h.requests.length > polled);
  h.cleanup();
});
