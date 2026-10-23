import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configurationModule } from '../configuration-fixture.mjs';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
class ApiError extends Error {
  constructor(status, code = 'http') { super('Failed'); this.code = code; this.status = status; }
}
const profile = { registered: true, userId: '42', identityId: 'identity', name: 'Alice', avatarUrl: '/alice.png' };

// Run the actual provider with persistent hooks and controllable async boundaries.
function harness({ signedIn = true } = {}) {
  const slots = [], resolutions = [], registrations = [], pushes = [];
  let index, dirty = false, value, userId = '87', apiUserId, loginCalls = 0;
  let effects = [], layouts = [];
  const loginRequest = deferred();
  const blux = {
    isAuthenticated: signedIn,
    user: signedIn ? { address: 'GA', authMethod: 'wallet', authValue: 'wallet' } : null,
    login: () => { loginCalls++; return loginRequest.promise; },
    logout: () => { blux.isAuthenticated = false; blux.user = null; },
  };
  const memo = (fn, deps) => {
    const i = index++;
    if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) slots[i] = { deps, value: fn() };
    return slots[i].value;
  };
  const effect = (fn, deps, queue) => {
    const i = index++;
    if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) {
      const previous = slots[i];
      slots[i] = { deps };
      queue.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
    }
  };
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; dirty = true; }];
    },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
    useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect: (fn, deps) => effect(fn, deps, effects),
    useLayoutEffect: (fn, deps) => effect(fn, deps, layouts),
    useEffectEvent(fn) {
      const i = index++;
      slots[i] ??= { call: (...args) => slots[i].fn(...args) };
      slots[i].fn = fn;
      return slots[i].call;
    },
  };
  const router = { push: path => pushes.push(path) };
  const notify = () => {};
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => router, usePathname: () => '/register' },
    '@bluxcc/react': { useBlux: () => blux },
    '@/lib/api/auth': {
      resolveAccount: input => { const request = { ...deferred(), input }; resolutions.push(request); return request.promise; },
      registerAccount: input => { const request = { ...deferred(), input }; registrations.push(request); return request.promise; },
    },
    '@/lib/api/client': { ApiError, configureApi() {}, getApiUserId: () => apiUserId, setApiUserId: id => { apiUserId = id; }, isAbortError: error => error.name === 'AbortError' },
    '@/lib/auth-provider': { getAuthProviderUserId: () => userId },
    '@/lib/auth-return': { saveAuthReturnTo() {}, consumeAuthReturnTo() {} },
    '@/components/ui/toast': { useNotify: () => notify },
    '@/lib/launchpad': { LaunchpadContext: { Provider: 'Provider' } },
    '@/lib/api/config': configurationModule,
    '@/lib/configuration': {}, '@/lib/blux-config': {}, '@/lib/stellar/network': {},
  };
  const source = readFileSync(new URL('./client-app.tsx', import.meta.url), 'utf8') + '\nexport { LaunchpadProvider };';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, require: name => {
    assert.ok(name in mocks, name); return mocks[name];
  }, AbortController, window: { location: { pathname: '/register' } } });
  function render() {
    dirty = false; index = 0; effects = []; layouts = [];
    value = module.exports.LaunchpadProvider({ children: null, apiBaseUrl: '' }).props.value;
    layouts.forEach(run => run()); effects.forEach(run => run());
  }
  async function flush() {
    for (let i = 0; i < 8; i++) { await Promise.resolve(); if (dirty) render(); }
  }
  function switchAccount(id, address = 'GA') {
    userId = id; blux.isAuthenticated = !!id;
    blux.user = id ? { address, authMethod: 'wallet', authValue: 'wallet' } : null;
    render();
  }
  render();
  return { resolutions, registrations, pushes, flush, switchAccount, loginRequest,
    get value() { return value; }, get apiUserId() { return apiUserId; }, get loginCalls() { return loginCalls; } };
}

test('existing and alternate Blux IDs use the resolved profile without registration', async () => {
  for (const id of ['42', '87']) {
    const h = harness();
    h.switchAccount(id);
    assert.equal(h.value.loginPending, true);
    assert.equal(h.value.accountReady, false);
    const request = h.resolutions.at(-1);
    assert.equal(request.input.userId, id);
    assert.equal(request.input.address, 'GA');
    request.resolve(profile);
    await h.flush();
    assert.equal(h.value.accountReady, true);
    assert.equal(h.value.account.profile.userId, id);
    assert.equal(h.value.account.profile.identityId, 'identity');
    assert.equal(h.value.account.profile.avatarUrl, '/alice.png');
    assert.equal(h.apiUserId, id);
    assert.equal(h.registrations.length, 0);
    assert.equal(h.value.loginPending, false);
  }
});

test('new wallets and incomplete existing names receive profile completion', async () => {
  for (const result of [{ registered: false }, { ...profile, name: '   ' }]) {
    const h = harness();
    h.resolutions[0].resolve(result); await h.flush();
    assert.equal(h.value.account.status, 'unregistered');
    const first = h.value.register({ name: 'New name' });
    assert.equal((await h.value.register({ name: 'Duplicate' })).ok, false);
    assert.equal(h.registrations.length, 1);
    assert.equal(h.registrations[0].input.address, 'GA');
    h.registrations[0].resolve({ ...profile, name: 'New name', addresses: ['GA'] });
    assert.equal((await first).ok, true); await h.flush();
    assert.equal(h.value.account.profile.name, 'New name');
    assert.equal(h.value.account.profile.userId, '87');
  }
});

test('resolution failures show errors, block registration and allow retry', async () => {
  for (const status of [400, 401, 403, 409, 503]) {
    const h = harness();
    h.resolutions[0].reject(new ApiError(status)); await h.flush();
    assert.equal(h.value.account.status, 'error');
    assert.equal((await h.value.register({ name: 'Alice' })).ok, false);
    assert.equal(h.registrations.length, 0);
    h.value.retryStatusCheck(); await h.flush();
    assert.equal(h.value.account.status, 'checking');
    h.resolutions[1].resolve(profile); await h.flush();
    assert.equal(h.value.accountReady, true);
  }
});

test('switching accounts clears the previous profile immediately and ignores old resolution', async () => {
  const h = harness();
  h.resolutions[0].resolve(profile); await h.flush();
  h.switchAccount('88', 'GB');
  assert.equal(h.value.account.status, 'checking');
  assert.equal(h.value.account.profile, undefined);
  const pending = h.resolutions[1];
  h.switchAccount('99', 'GC');
  assert.equal(pending.input.signal.aborted, true);
  h.resolutions[2].resolve({ ...profile, name: 'Carol' }); await h.flush();
  pending.resolve({ ...profile, name: 'Bob' }); await h.flush();
  assert.equal(h.value.account.profile.name, 'Carol');
  assert.equal(h.apiUserId, '99');
});

test('same-ID wallet changes and switching away and back invalidate pending registrations', async () => {
  for (const nextId of ['87', '88']) {
    const h = harness();
    h.resolutions[0].resolve({ registered: false }); await h.flush();
    const pending = h.value.register({ name: 'Old account' });
    h.switchAccount(nextId, 'GB');
    h.switchAccount('87', 'GA');
    h.resolutions.at(-1).resolve({ ...profile, name: 'Current account' }); await h.flush();
    h.registrations[0].resolve({ ...profile, name: 'Old account' });
    assert.equal((await pending).ok, false); await h.flush();
    assert.equal(h.value.account.profile.name, 'Current account');
  }
});

test('logout immediately invalidates resolution even before the next render', async () => {
  const h = harness();
  h.value.logout();
  h.resolutions[0].resolve(profile); await h.flush();
  assert.equal(h.value.account.status, 'signed-out');
  assert.equal(h.apiUserId, null);
});

test('an obsolete failed resolution cannot replace the new account with an error', async () => {
  const h = harness();
  h.switchAccount('88', 'GB');
  h.resolutions[1].resolve(profile); await h.flush();
  h.resolutions[0].reject(new ApiError(409)); await h.flush();
  assert.equal(h.value.account.status, 'registered');
  assert.equal(h.value.account.profile.userId, '88');
});

test('registration network recovery resolves identity and never assumes success on a failed recheck', async () => {
  for (const succeeds of [true, false]) {
    const h = harness();
    h.resolutions[0].resolve({ registered: false }); await h.flush();
    const pending = h.value.register({ name: 'Alice' });
    h.registrations[0].reject(new ApiError(undefined, 'timeout')); await h.flush();
    assert.equal(h.resolutions[1].input.address, 'GA');
    assert.equal(h.resolutions[1].input.userId, '87');
    if (succeeds) h.resolutions[1].resolve(profile);
    else h.resolutions[1].reject(new ApiError(503));
    assert.equal((await pending).ok, succeeds); await h.flush();
    assert.equal(h.value.account.status, succeeds ? 'registered' : 'unregistered');
  }
});

test('disconnect during a pending Blux login prevents its late completion from routing or hanging', async () => {
  const h = harness({ signedIn: false });
  const pending = h.value.login();
  h.switchAccount('87');
  h.switchAccount(null);
  h.loginRequest.resolve();
  await pending; await h.flush();
  assert.equal(h.value.loginPending, false);
  assert.equal(h.value.account.status, 'signed-out');
  assert.deepEqual(h.pushes, []);
});

test('login stays pending through resolution and duplicate login calls do not reopen Blux', async () => {
  const h = harness({ signedIn: false });
  const pending = h.value.login();
  await h.value.login();
  assert.equal(h.loginCalls, 1);
  h.switchAccount('87'); h.loginRequest.resolve(); await h.flush();
  assert.equal(h.value.loginPending, true);
  h.resolutions[0].resolve(profile);
  await pending; await h.flush();
  assert.equal(h.value.accountReady, true);
  assert.equal(h.value.loginPending, false);
});
