import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../lib/api/config.fixture.mjs';

const code = ts.transpileModule(readFileSync(new URL('./configuration-provider.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function harness({ initializationError, waitForClients = false } = {}) {
  const states = [], effects = [], events = [], storage = new Map();
  const timers = new Map();
  let now = 0, timerId = 0;
  let stateIndex = 0, effectIndex = 0, resolve, reject, requested = null;
  let pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  let releaseClients;
  const clientsReady = new Promise(resolve => { releaseClients = resolve; });
  const jsx = (type, props) => ({ type, props });
  const network = { API_NETWORK: undefined, configureNetwork: (config, selected) => { events.push('network:' + selected); network.API_NETWORK = selected; } };
  const mocks = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useEffect(callback, deps) {
        const index = effectIndex++, previous = effects[index];
        if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
          previous?.cleanup?.(); effects[index] = { deps, callback };
        }
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useSearchParams: () => ({ get: () => requested }) },
    '@/lib/api/client': { configureApi: () => events.push('api-origin'), configureApiNetwork: n => events.push('header:' + n) },
    '@/lib/api/config': {
      loadConfiguration: () => { events.push('fetch'); return pending; },
      retryConfiguration: () => { events.push('retry'); pending = Promise.resolve(configuration); return pending; },
      selectNetwork: (config, requested) => {
        if (requested && !config.network.supported.includes(requested)) throw new Error('Unsupported network.');
        return requested ?? config.network.default;
      },
    },
    '@/lib/stellar/network': network,
    '@/lib/stellar/clients': { initializeStellarClients: async () => {
      events.push('clients');
      if (initializationError) throw new Error(initializationError);
      if (waitForClients) await clientsReady;
    } },
    './app-loading': { AppLoading: 'AppLoading' },
    '@/components/ui/button': { Button: 'Button' },
    '@/lib/configuration': { ConfigurationContext: { Provider: 'Config' } },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, Error, URLSearchParams,
    Date: class extends Date { static now() { return now; } },
    setTimeout: (callback, delay) => {
      const id = ++timerId;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    window: { location: { get search() { return requested ? '?network=' + requested : ''; }, reload() { events.push('reload'); } } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    require: name => { assert.ok(name in mocks, name); return mocks[name]; },
  });
  function render() {
    stateIndex = 0; effectIndex = 0;
    const tree = module.exports.ConfigurationProvider({ children: 'Application', apiBaseUrl: 'https://api.example' });
    for (const effect of effects) if (effect.callback) { effect.cleanup = effect.callback(); effect.callback = null; }
    return tree;
  }
  return {
    render, events, releaseClients,
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) {
        timers.delete(id); timer.callback();
      }
    },
    unmount() { for (const effect of effects) effect.cleanup?.(); },
    resolve: () => resolve(configuration),
    reject: () => reject(new Error('Configuration unavailable.')),
    select: value => { requested = value; },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('wallet and application remain unmounted until network identity is verified', async () => {
  const h = harness({ waitForClients: true });
  h.select('public'); h.render(); h.resolve(); await settle(); h.advance(1000);
  assert.equal(h.render().type, 'AppLoading');
  assert.ok(!h.events.includes('header:public'));
  h.releaseClients(); await settle();
  assert.equal(h.render().type, 'Config');
  assert.ok(h.events.includes('header:public'));
});

test('mismatched Mainnet providers show an error before mounting the wallet', async () => {
  const h = harness({ initializationError: 'Mainnet endpoints connect to a different Stellar network.' });
  h.select('public'); h.render(); h.resolve(); await settle(); h.advance(1000);
  const error = h.render();
  assert.equal(error.type, 'main');
  assert.match(error.props.children[0].props.children, /Mainnet endpoints/);
  assert.ok(!h.events.includes('header:public'));
});

test('loading never renders dependent children or initializes wallet clients early', async () => {
  const h = harness();
  const loading = h.render();
  assert.equal(loading.type, 'AppLoading');
  assert.deepEqual(h.events, ['api-origin', 'fetch']);
  h.resolve(); await settle();
  h.advance(499);
  assert.equal(h.render().type, 'AppLoading');
  h.advance(1);
  const ready = h.render();
  assert.equal(ready.type, 'Config');
  assert.equal(ready.props.children, 'Application');
  assert.deepEqual(h.events.slice(2), ['network:testnet', 'clients', 'header:testnet']);
});

test('failed configuration has an actionable Retry and keeps dependent children unmounted', async () => {
  const h = harness(); h.render(); h.reject(); await settle();
  const error = h.render();
  assert.equal(error.type, 'main');
  assert.equal(error.props.children[0].props.role, 'alert');
  assert.match(error.props.children[0].props.children, /unavailable/);
  error.props.children[1].props.onClick();
  assert.equal(h.render().type, 'AppLoading');
  await settle();
  h.advance(500);
  assert.equal(h.render().props.children, 'Application');
  assert.ok(h.events.includes('retry'));
});

test('an unsupported selected network stays in the error state instead of initializing a different one', async () => {
  const h = harness(); h.select('typo'); h.render(); h.resolve(); await settle();
  const tree = h.render();
  assert.equal(tree.props.children[0].props.role, 'alert');
  assert.ok(!h.events.includes('clients'));
});

test('a network change unmounts the application and reloads instead of mutating transaction clients', async () => {
  const h = harness(); h.render(); h.resolve(); await settle(); h.advance(500); h.render();
  h.select('public');
  assert.equal(h.render().type, 'AppLoading');
  assert.equal(h.events.at(-1), 'reload');
  assert.equal(h.events.filter(value => value === 'clients').length, 1);
});

test('slow configuration reveals the application immediately without an extra delay', async () => {
  const h = harness(); h.render(); h.advance(750);
  assert.equal(h.render().type, 'AppLoading');
  h.resolve(); await settle();
  assert.equal(h.render().type, 'Config');
});

test('unmounting cancels the pending loading delay', async () => {
  const h = harness(); h.render(); h.resolve(); await settle();
  h.unmount(); h.advance(500);
  assert.equal(h.render().type, 'AppLoading');
});
