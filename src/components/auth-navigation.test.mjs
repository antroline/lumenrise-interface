import { apiContextModule, configurationModule, networkModule } from '../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const jsx = (type, props) => ({ type, props });
function load(file, mocks, window, expose = '', environment = 'test') {
  const source = readFileSync(resolve(file), 'utf8') + expose;
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, window, URL,
    process: { env: { NODE_ENV: environment } },
    require: (name) => name === '@/components/shell/network-wallet-button' ? { NetworkWalletButton: 'WalletControl' } : name === '@/lib/api/client' ? { ...apiContextModule, ...mocks[name] } : name === '@/lib/api/config' ? configurationModule : name === '@/lib/stellar/network' ? networkModule : name === '@/lib/configuration' || name === '@/lib/blux-config' ? {} : name === '@/lib/client-rules' ? {imageHint: () => 'Server image rules'} : name in mocks ? mocks[name] : require(name),
  });
  return module.exports;
}
function browser(path = '/launch/token?network=public#team', saved) {
  const url = new URL(path, 'https://lumenrise.local');
  const storage = new Map(saved ? [['launchpad:returnTo', saved]] : []);
  const window = { location: url, sessionStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } };
  return { window, storage, auth: load('src/lib/auth-return.ts', {}, window) };
}

test('authentication saves the full current URL instead of a caller default or stale destination', () => {
  const h = browser('/launch/token?network=public#team', '/portfolio');
  h.auth.saveAuthReturnTo('/launch/token?network=testnet');
  assert.equal(h.auth.consumeAuthReturnTo(), '/launch/token?network=public#team');
  assert.equal(h.storage.size, 0);
});

test('registration preserves the saved page through reload and uses home for direct entry', () => {
  const h = browser('/register', '/create?tab=review#token');
  h.auth.saveAuthReturnTo('/portfolio');
  assert.equal(h.auth.consumeAuthReturnTo(), '/create?tab=review#token');
  const direct = browser('/register');
  direct.auth.saveAuthReturnTo();
  assert.equal(direct.auth.consumeAuthReturnTo(), '/');
});

test('return destinations reject external URLs and authentication loops', () => {
  const h = browser();
  for (const target of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/register', '/register?next=/portfolio', '/onboarding#finish', '/foo/../register']) {
    assert.equal(h.auth.authReturnPath(target), '/', target);
  }
});

function loginHarness(outcome, { path, authenticated = false, saved, environment = 'test' } = {}) {
  const h = browser(path, saved);
  const pushes = [], replacements = [], phases = [], refs = [];
  let stateIndex = 0, connectCount = 0;
  const account = { status: authenticated ? outcome : 'signed-out' };
  const blux = {
    isAuthenticated: authenticated,
    user: authenticated ? { address: 'owner', authMethod: 'wallet', authValue: 'wallet' } : null,
    login: async () => {
      connectCount++;
      // Emulate the registration status settling while the wallet login resolves.
      refs.find(ref => ref.current?.status === 'signed-out').current = { status: outcome };
      return { address: 'owner' };
    },
  };
  const mocks = {
    react: {
      useState: initial => {
        const index = stateIndex++;
        return [index === 1 ? { identity: authenticated ? '42:wallet:wallet:owner' : null, value: account } : typeof initial === 'function' ? initial() : initial, value => phases.push(value)];
      },
      useRef: current => { const ref = { current }; refs.push(ref); return ref; },
      useEffect() {}, useLayoutEffect() {}, useEffectEvent: fn => fn, useCallback: fn => fn, useMemo: fn => fn(),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: value => pushes.push(value), replace: value => replacements.push(value) }), usePathname: () => h.window.location.pathname },
    '@bluxcc/react': { useBlux: () => blux, networks: { testnet: {} } },
    '@/lib/api/auth': {}, '@/lib/api/client': {}, '@/lib/auth-provider': { getAuthProviderUserId: () => '42' },
    '@/lib/auth-return': h.auth,
    '@/components/ui/toast': { useNotify: () => message => { throw new Error(message); } },
    '@/lib/stellar/network': {}, '@/lib/launchpad': { LaunchpadContext: { Provider: 'Provider' } },
  };
  const { LaunchpadProvider } = load('src/components/client-app.tsx', mocks, h.window, '\nexport { LaunchpadProvider };', environment);
  const tree = LaunchpadProvider({ children: null, apiBaseUrl: '' });
  return { ...h, value: tree.props.value, login: tree.props.value.login, pushes, replacements, connectCount: () => connectCount, phases };
}

test('query parameters cannot grant account access or invent a wallet in development', () => {
  const h = loginHarness('signed-out', { path: '/portfolio?preview=1', environment: 'development' });
  assert.equal(h.value.isSignedIn, false);
  assert.equal(h.value.accountReady, false);
  assert.equal(h.value.address, undefined);
});

test('registered login stays on the current page and clears the consumed return target', async () => {
  const h = loginHarness('registered');
  await h.login('/portfolio');
  assert.equal(h.connectCount(), 1);
  assert.deepEqual(h.pushes, []);
  assert.deepEqual(h.replacements, []);
  assert.equal(h.storage.size, 0);
});

test('new users visit registration with their exact originating URL saved', async () => {
  const h = loginHarness('unregistered');
  await h.login();
  assert.deepEqual(h.pushes, ['/register']);
  assert.equal(h.storage.get('launchpad:returnTo'), '/launch/token?network=public#team');
});

test('a status-check error keeps the return page for the existing retry screen', async () => {
  const h = loginHarness('error');
  await h.login();
  assert.deepEqual(h.pushes, ['/register']);
  assert.equal(h.storage.get('launchpad:returnTo'), '/launch/token?network=public#team');
});

test('already connected registered users remain on their page without reopening Blux', async () => {
  const h = loginHarness('registered', { authenticated: true });
  await h.login('/portfolio');
  assert.equal(h.connectCount(), 0);
  assert.deepEqual(h.pushes, []);
});

test('login from registration leaves the saved destination for the page redirect effect', async () => {
  const h = loginHarness('registered', { path: '/register', saved: '/explorer?search=alice' });
  await h.login('/');
  assert.equal(h.storage.get('launchpad:returnTo'), '/explorer?search=alice');
  assert.deepEqual(h.pushes, []);
  assert.deepEqual(h.replacements, []);
});

function pageHarness(file, path, saved, account = { status: 'registered' }) {
  const h = browser(path, saved);
  const effects = [], replacements = [];
  const refs = [];
  const ui = names => Object.fromEntries(names.map(name => [name, name]));
  const mocks = {
    react: { useEffect: effect => effects.push(effect), useRef: current => { const ref = { current }; refs.push(ref); return ref; }, useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ replace: value => replacements.push(value) }) },
    'lucide-react': {}, '@/components/auth-gate': {}, '@/components/logo': ui(['LogoHorizontal']),
    '@/components/ui/button': {}, '@/components/ui/alert': {}, '@/components/ui/card': {},
    '@/components/ui/empty': ui(['Empty', 'EmptyHeader', 'EmptyMedia', 'EmptyTitle', 'EmptyDescription']),
    '@/components/ui/field': {}, '@/components/ui/input': {}, '@/components/ui/spinner': ui(['Spinner']),
    '@/components/image-crop-input': { ImageCropInput: 'ImageCropInput' }, '@/lib/image': {}, '@/lib/launchpad': { useLaunchpad: () => ({ isSignedIn: true, account }) },
    '@/lib/auth-return': h.auth,
  };
  const page = load(file, mocks, h.window).default;
  page();
  return { ...h, effects, replacements };
}

for (const file of ['src/app/register/page.tsx', 'src/app/onboarding/page.tsx']) {
  test(`${file} returns to the saved page once, including under effect replay`, () => {
    const h = pageHarness(file, file.includes('onboarding') ? '/onboarding' : '/register', '/launch/token?network=public#team');
    h.effects.forEach(effect => { effect(); effect(); });
    assert.deepEqual(h.replacements, ['/launch/token?network=public#team']);
    assert.equal(h.storage.size, 0);
  });
}

test('registration failures stay on the form without consuming the return page', () => {
  const h = pageHarness('src/app/register/page.tsx', '/register', '/create', { status: 'error', message: 'Retry' });
  h.effects.forEach(effect => effect());
  assert.deepEqual(h.replacements, []);
  assert.equal(h.storage.get('launchpad:returnTo'), '/create');
});

function profileHarness({ update = async () => ({ identityId: 'idn_1', name: 'Updated name', avatarUrl: '/updated.webp' }), read = async () => ({ identityId: 'idn_1', name: 'Old name', avatarUrl: '/old.webp' }) } = {}) {
  const h = browser('/settings');
  const identity = '42:wallet:wallet:owner';
  let snapshot = { identity, value: { status: 'registered', profile: { userId: '42', identityId: 'idn_1', name: 'Old name', avatarUrl: '/old.webp', addresses: ['owner'] } } };
  const refs = [], calls = [];
  let stateIndex = 0, reads = 0, deletes = 0;
  class ApiError extends Error {}
  const mocks = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        return index === 1 ? [snapshot, value => { snapshot = value; }] : [initial, () => {}];
      },
      useRef(current) { const ref = { current }; refs.push(ref); return ref; },
      useEffect() {}, useLayoutEffect() {}, useEffectEvent: fn => fn, useCallback: fn => fn, useMemo: fn => fn(),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ replace() {}, push() {} }), usePathname: () => '/settings' },
    '@bluxcc/react': { useBlux: () => ({ isAuthenticated: true, user: { address: 'owner', authMethod: 'wallet', authValue: 'wallet' }, logout() {} }) },
    '@/lib/api/auth': {
      updateProfile: async input => { calls.push(input); return update(input); },
      getProfile: async () => { reads++; return read(); },
      deleteAvatar: async () => { deletes++; },
    },
    '@/lib/api/client': { ApiError, getApiUserId: () => '42', setApiUserId() {} },
    '@/lib/auth-provider': { getAuthProviderUserId: () => '42' }, '@/lib/auth-return': h.auth,
    '@/components/ui/toast': { useNotify: () => () => {} },
    '@/lib/launchpad': { LaunchpadContext: { Provider: 'Provider' } },
  };
  const { LaunchpadProvider } = load('src/components/client-app.tsx', mocks, h.window, '\nexport { LaunchpadProvider };');
  const value = LaunchpadProvider({ children: null, apiBaseUrl: '' }).props.value;
  refs.find(ref => ref.current === null).current = {};
  return { value, calls, current: () => snapshot.value, reads: () => reads, deletes: () => deletes };
}

test('profile update merges the PUT result into shared state without a follow-up GET', async () => {
  const h = profileHarness();
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' });
  assert.equal((await h.value.updateProfile({ name: 'Updated name', avatar: photo })).ok, true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.reads(), 0);
  assert.equal(h.current().profile.name, 'Updated name');
  assert.equal(h.current().profile.avatarUrl, '/updated.webp');
  assert.deepEqual(h.current().profile.addresses, ['owner']);
  assert.equal(h.current().profile.userId, '42');
});

test('a stale profile refresh cannot replace a successful profile mutation', async () => {
  let finishRead;
  const h = profileHarness({ read: () => new Promise(resolve => { finishRead = resolve; }) });
  const refresh = h.value.refreshProfile();
  await h.value.updateProfile({ name: 'Updated name' });
  finishRead({ identityId: 'idn_1', name: 'Old name', avatarUrl: '/old.webp' });
  await refresh;
  assert.equal(h.current().profile.name, 'Updated name');
  assert.equal(h.current().profile.avatarUrl, '/updated.webp');
});

test('profile actions retain deletion behavior and cannot update a signed-out session', async () => {
  const h = profileHarness();
  await h.value.updateProfile({ name: 'Updated name' });
  assert.equal((await h.value.removeAvatar()).ok, true);
  assert.equal(h.deletes(), 1);
  assert.equal(h.current().profile.avatarUrl, null);
  assert.equal(h.current().profile.name, 'Updated name');
  let finishUpdate;
  const other = profileHarness({ update: () => new Promise(resolve => { finishUpdate = resolve; }) });
  const pending = other.value.updateProfile({ name: 'New name' });
  other.value.logout();
  finishUpdate({ identityId: 'idn_1', name: 'New name', avatarUrl: '/new.webp' });
  assert.equal((await pending).ok, false);
  assert.equal(other.current().status, 'signed-out');
});
