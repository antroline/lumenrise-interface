import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const DID = 'did:privy:alice';
const profile = { userId: DID, identityId: 'base-identity', name: 'Alice', avatarUrl: null, addresses: [ADDRESS] };
const registered = { ...profile, registered: true };
const source = ts.transpileModule(readFileSync(new URL('./base-account-provider.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness(overrides = {}) {
  const state = { ready: true, authenticated: true, user: { id: DID, linkedAccounts: [{ type: 'wallet', chainType: 'ethereum', address: ADDRESS }] }, wallets: [{ address: ADDRESS }], ...overrides };
  const slots = [], effects = [], calls = [], routes = [], notifications = [], auth = { userId: null, adapter: null };
  let cursor = 0, effectCursor = 0;
  const api = {
    resolveAccount: async input => { calls.push(['resolve', input]); return registered; },
    registerAccount: async input => { calls.push(['register', input]); return profile; },
    getProfile: async () => profile,
    updateProfile: async input => ({ ...profile, ...input }),
    deleteAvatar: async () => {},
  };
  const cache = { cancelQueries: async () => calls.push(['cancel']), clear: () => calls.push(['clear']) };
  function effect(callback, dependencies, layout) {
    const index = effectCursor++, previous = effects[index];
    if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
      previous?.cleanup?.();
      effects[index] = { dependencies, callback, layout };
    }
  }
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(callback, dependencies) { const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) slots[index] = { callback, dependencies };
      return slots[index].callback; },
    useEffect: (callback, dependencies) => effect(callback, dependencies, false),
    useLayoutEffect: (callback, dependencies) => effect(callback, dependencies, true),
  };
  let token = 'first';
  const getAccessToken = async () => token;
  const mocks = {
    react: hooks,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@privy-io/react-auth': {
      usePrivy: () => ({ ...state, getAccessToken, login: () => calls.push(['login']), logout: async () => { calls.push(['logout']); state.authenticated = false; } }),
      useWallets: () => ({ wallets: state.wallets, ready: true }),
      useActiveWallet: () => ({ wallet: state.wallets[0] }),
    },
    'next/navigation': { useRouter: () => ({ push: path => routes.push(path) }), usePathname: () => '/settings' },
    '@tanstack/react-query': { useQueryClient: () => cache },
    '@/lib/launchpad': { LaunchpadContext: { Provider: 'Account' } },
    '@/lib/api/auth': api,
    '@/lib/api/client': {
      ApiError: class ApiError extends Error {},
      setApiUserId: value => { auth.userId = value; }, setBaseAuthentication: value => { auth.adapter = value; },
    },
    '@/lib/auth-return': { saveAuthReturnTo: () => calls.push(['return']) },
    '@/components/ui/toast': { useNotify: () => (...args) => notifications.push(args) },
    '@/lib/base/wallet': {
      sameEvmAddress: (a, b) => a.toLowerCase() === b.toLowerCase(),
      linkedEvmAddresses: accounts => accounts.filter(account => account.type === 'wallet' || account.type === 'smart_wallet').map(account => account.address.toLowerCase()),
      selectLinkedWallet: (wallets, linked) => wallets.find(wallet => linked.includes(wallet.address.toLowerCase())),
    },
  };
  const module = { exports: {} };
  runInNewContext(source, { module, exports: module.exports, AbortController, Error,
    window: { location: { search: '?network=base-sepolia' } },
    require: name => { assert.ok(name in mocks, name); return mocks[name]; },
  });
  function render() {
    cursor = effectCursor = 0;
    const value = module.exports.BaseAccountProvider({ children: 'CONTENT' }).props.value;
    for (const layout of [true, false]) for (const entry of effects) if (entry.layout === layout && entry.callback) {
      const callback = entry.callback; entry.callback = null; entry.cleanup = callback();
    }
    return value;
  }
  return { render, state, api, auth, calls, routes, notifications, setToken: value => { token = value; },
    unmount: () => effects.forEach(entry => entry.cleanup?.()) };
}

test('Privy identity resolves into the existing account context and reads a fresh SDK token', async () => {
  const h = harness();
  assert.equal(h.render().accountReady, false);
  await settle();
  const account = h.render();
  assert.equal(account.accountReady, true);
  assert.equal(account.account.profile.userId, DID);
  assert.equal(account.account.profile.identityId, profile.identityId);
  assert.equal(h.auth.userId, DID);
  assert.equal(await h.auth.adapter.getAccessToken(), 'first');
  h.setToken('renewed');
  assert.equal(await h.auth.adapter.getAccessToken(), 'renewed');
  h.unmount();
  assert.equal(h.auth.userId, null); assert.equal(h.auth.adapter, null);
});

test('unregistered Privy users reuse registration and retain verified backend addresses', async () => {
  const h = harness();
  h.api.resolveAccount = async () => ({ registered: false, userId: DID });
  h.render(); await settle();
  const account = h.render();
  assert.equal(account.isSignedIn, true);
  assert.equal(account.account.status, 'unregistered');
  assert.equal(h.routes[0], '/register?network=base-sepolia');
  const result = await account.register({ name: 'Alice' });
  assert.equal(result.ok, true);
  assert.equal(h.render().account.profile.addresses[0], ADDRESS);
  assert.equal(h.calls.find(call => call[0] === 'register')[1].avatar, undefined);
});

test('missing or unrelated connected wallets cannot resolve or register', async () => {
  const h = harness({ wallets: [{ address: '0x' + 'f'.repeat(40) }] });
  h.render(); await settle();
  const account = h.render();
  assert.equal(account.account.status, 'error');
  assert.equal((await account.register({ name: 'Alice' })).ok, false);
  assert.ok(!h.calls.some(call => call[0] === 'resolve' || call[0] === 'register'));
});

test('late identity resolution cannot publish another user profile', async () => {
  let release;
  const h = harness();
  h.api.resolveAccount = () => new Promise(resolve => { release = resolve; });
  h.render();
  const old = release;
  h.state.user = { ...h.state.user, id: 'did:privy:bob' };
  assert.equal(h.render().accountReady, false);
  old(registered); await settle();
  assert.equal(h.render().accountReady, false);
  release({ ...registered, userId: 'did:privy:bob', name: 'Bob' }); await settle();
  assert.equal(h.render().account.profile.name, 'Bob');
});

test('registration is single-submit and cannot publish after switching away and back to the same identity', async () => {
  let release;
  const h = harness();
  h.api.resolveAccount = async () => ({ registered: false, userId: DID });
  h.api.registerAccount = () => new Promise(resolve => { release = resolve; });
  h.render(); await settle();
  const account = h.render(), request = account.register({ name: 'Alice' });
  assert.equal((await account.register({ name: 'Alice' })).ok, false);
  h.state.authenticated = false; h.render();
  h.state.authenticated = true; h.render(); await settle();
  release(profile);
  assert.equal((await request).ok, false);
  assert.equal(h.render().accountReady, false);
});

test('profile mutations beat stale refreshes; wallet synchronization reuses registration', async () => {
  let release;
  const h = harness();
  h.render(); await settle();
  h.api.getProfile = () => new Promise(resolve => { release = resolve; });
  const account = h.render(), refresh = account.refreshProfile();
  assert.equal((await account.updateProfile({ name: 'Edited' })).ok, true);
  release(profile); await refresh;
  assert.equal(h.render().account.profile.name, 'Edited');
  assert.equal((await h.render().syncWallets()).ok, true);
  assert.equal(h.calls.find(call => call[0] === 'register')[1].address, ADDRESS);
});

test('logout immediately clears Base application auth and query state without involving Blux', async () => {
  const h = harness();
  h.render(); await settle();
  h.render().logout();
  assert.equal(h.auth.userId, null); assert.equal(h.auth.adapter, null);
  assert.ok(h.calls.some(call => call[0] === 'clear'));
  await settle();
  assert.equal(h.render().accountReady, false);
  assert.ok(h.calls.some(call => call[0] === 'logout'));
});

test('expired authentication clears credentials, blocks mutations and gives an actionable account error', async () => {
  const h = harness();
  h.render(); await settle();
  h.auth.adapter.onExpired();
  const account = h.render();
  assert.equal(account.accountReady, false);
  assert.equal(account.account.status, 'error');
  assert.match(account.account.message, /Sign out and sign in again/);
  assert.equal(h.auth.userId, null); assert.equal(h.auth.adapter, null);
  assert.equal((await account.updateProfile({ name: 'Must not save' })).ok, false);
});
