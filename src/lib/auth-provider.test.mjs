import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadSource(filename, globals = {}) {
  const path = resolve(directory, filename);
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, Date, Error, JSON,
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    require: (name) => require(name),
    ...globals,
  }, { filename: path });
  return module.exports;
}

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function storageMock(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function loadWithStorage(entries) {
  return loadSource('auth-provider.ts', {
    window: { localStorage: storageMock(entries) },
  });
}

test('returns null without a stored provider session', () => {
  const provider = loadWithStorage({});
  assert.equal(provider.getAuthProviderUserId(), null);
});

test('extracts a numeric sub claim from the stored token', () => {
  const provider = loadWithStorage({
    __BLUX__JWT_STORE: token({ sub: 42 }),
  });
  assert.equal(provider.getAuthProviderUserId(), '42');
});

test('accepts a numeric string sub claim', () => {
  const provider = loadWithStorage({
    __BLUX__JWT_STORE: token({ sub: '42' }),
  });
  assert.equal(provider.getAuthProviderUserId(), '42');
});

test('falls back to the persisted session record and other claim names', () => {
  const provider = loadWithStorage({
    __BLUX__RECENT_LOGIN_CONFIG: JSON.stringify({
      authMethod: 'wallet',
      authValue: 'rabet',
      timestamp: Date.now(),
      jwt: token({ user_id: 7 }),
    }),
  });
  assert.equal(provider.getAuthProviderUserId(), '7');
});

test('an empty session record token yields null', () => {
  const provider = loadWithStorage({
    __BLUX__RECENT_LOGIN_CONFIG: JSON.stringify({
      authMethod: 'wallet', authValue: 'rabet', timestamp: Date.now(), jwt: '',
    }),
  });
  assert.equal(provider.getAuthProviderUserId(), null);
});

test('a wallet address is never mistaken for a user id', () => {
  const provider = loadWithStorage({
    __BLUX__JWT_STORE: token({ sub: 'GDEMO6K4KQPR5H7NQOL6UPRTMPL4TE6CYXW2LP7SSQ3J2BQY7X2Q' }),
  });
  assert.equal(provider.getAuthProviderUserId(), null);
});

test('rejects non-positive or non-integer ids', () => {
  for (const sub of [0, -3, 1.5, '0', 'abc']) {
    const provider = loadWithStorage({ __BLUX__JWT_STORE: token({ sub }) });
    assert.equal(provider.getAuthProviderUserId(), null, `sub=${sub}`);
  }
});

test('malformed tokens yield null', () => {
  const provider = loadWithStorage({ __BLUX__JWT_STORE: 'not-a-token' });
  assert.equal(provider.getAuthProviderUserId(), null);
  const broken = loadWithStorage({ __BLUX__JWT_STORE: 'a.!!!.c' });
  assert.equal(broken.getAuthProviderUserId(), null);
});

test('prefers sub over other claim names', () => {
  const provider = loadWithStorage({
    __BLUX__JWT_STORE: token({ sub: '42', id: 9 }),
  });
  assert.equal(provider.getAuthProviderUserId(), '42');
});

test('returns null outside the browser', () => {
  const provider = loadSource('auth-provider.ts');
  assert.equal(provider.getAuthProviderUserId(), null);
});
