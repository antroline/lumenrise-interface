import { configurationModule, networkModule } from '../../configuration-fixture.mjs';
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

// Execute the actual TypeScript with the network boundary replaced by a stub.
function loadSource(filename, mocks = {}, globals = {}, cache = new Map()) {
  const path = resolve(directory, filename);
  if (path.replaceAll('\\', '/').endsWith('/lib/api/config.ts')) return configurationModule;
  if (path.replaceAll('\\', '/').endsWith('/lib/stellar/network.ts')) return networkModule;
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, URLSearchParams, Date, Error, JSON, URL,
    setTimeout, clearTimeout, AbortController, FormData, DOMException, createImageBitmap: async () => ({width: 128, height: 128, close() {}}),
    require: (name) => name === '@/lib/api/config' ? configurationModule : name === '@/lib/stellar/network' ? networkModule : name in mocks ? mocks[name] : name.startsWith('.')
      ? loadSource(resolve(dirname(path), `${name}.ts`), mocks, globals, cache)
      : require(name),
    ...globals,
  }, { filename: path });
  return module.exports;
}

function response({ status = 200, body = '' }) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

// deepStrictEqual across vm realms compares prototypes; normalize instead.
function same(actual, expected) {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
}

function successBody(result, message = 'ok') {
  return JSON.stringify({ status: 'success', message, result });
}

/** Builds a module set with a recording fetch stub. */
function harness(handler) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (handler) return handler(url, init);
    return response({ body: successBody({}) });
  };
  const cache = new Map();
  const client = loadSource('client.ts', {}, { fetch }, cache);
  const auth = loadSource('auth.ts', {}, { fetch }, cache);
  return { calls, client, auth };
}

test('resolution posts the selected wallet and retains the current Blux ID for later headers', async () => {
  const { client, auth, calls } = harness((url, init) => {
    if (url.endsWith('/auth/resolve')) {
      assert.equal(init.method, 'POST');
      assert.equal(init.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(init.body), { userId: '87', address: 'GABC' });
      return response({ body: successBody({ registered: true, userId: '42', identityId: 'same-identity', name: 'Alice', avatarUrl: '/a.png' }) });
    }
    assert.equal(init.headers['X-User-Id'], '87');
    return response({ body: successBody({ identityId: 'same-identity', name: 'Alice' }) });
  });
  client.setApiUserId('87');
  same(await auth.resolveAccount({ userId: '87', address: 'GABC' }), {
    registered: true, userId: '87', identityId: 'same-identity', name: 'Alice', avatarUrl: '/a.png',
  });
  await auth.getProfile();
  assert.equal(calls[0].url, '/v1/auth/resolve');
});

test('resolution accepts new wallets and identities with incomplete names', async () => {
  for (const result of [{ registered: false }, { registered: true, identityId: 'id', name: null }]) {
    const { auth } = harness(() => response({ body: successBody(result) }));
    const status = await auth.resolveAccount({ userId: '87', address: 'GABC' });
    assert.equal(status.registered, result.registered);
    if (status.registered) assert.equal(status.name, '');
  }
});

test('resolution never converts HTTP failures or malformed responses into onboarding', async () => {
  for (const status of [400, 401, 403, 409, 503]) {
    const { auth } = harness(() => response({ status, body: JSON.stringify({ status: 'error', message: 'Failed', result: { registered: false } }) }));
    await assert.rejects(auth.resolveAccount({ userId: '87', address: 'GABC' }), error => error.status === status);
  }
  for (const result of [{}, { registered: true }, { registered: true, identityId: 'id', name: 123 }]) {
    const { auth } = harness(() => response({ body: successBody(result) }));
    await assert.rejects(auth.resolveAccount({ userId: '87', address: 'GABC' }), error => error.code === 'invalid-response');
  }
});

test('joins the API base URL without duplicating /v1', () => {
  const { client } = harness();
  client.configureApi('http://localhost:5000');
  assert.equal(client.apiUrl('/auth/status'), 'http://localhost:5000/v1/auth/status');
  client.configureApi('http://localhost:5000/v1');
  assert.equal(client.apiUrl('/auth/status'), 'http://localhost:5000/v1/auth/status');
  client.configureApi('http://localhost:5000/v1/');
  assert.equal(client.apiUrl('auth/status'), 'http://localhost:5000/v1/auth/status');
  client.configureApi('');
  assert.equal(client.apiUrl('/auth/status'), '/v1/auth/status');
});

test('resolves API file URLs against the API origin', () => {
  const { client } = harness();
  assert.equal(client.resolveApiFileUrl(null), null);
  assert.equal(client.resolveApiFileUrl('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  client.configureApi('http://localhost:5000/v1');
  assert.equal(client.resolveApiFileUrl('/files/a.jpg'), 'http://localhost:5000/files/a.jpg');
  client.configureApi('');
  assert.equal(client.resolveApiFileUrl('/files/a.jpg'), '/files/a.jpg');
});

test('formats byte limits for display', () => {
  const { client } = harness();
  assert.equal(client.formatByteLimit(5 * 1024 * 1024), '5 MB');
  assert.equal(client.formatByteLimit(2.5 * 1024 * 1024), '2.5 MB');
  assert.equal(client.formatByteLimit(512 * 1024), '512 KB');
  assert.equal(client.formatByteLimit(0), '');
});

test('parses the unregistered status envelope and sends X-User-Id', async () => {
  const { calls, client, auth } = harness((_url, init) => {
    assert.equal(init.headers['X-User-Id'], '42');
    assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined);
    return response({
      body: successBody({ registered: false, userId: '42' }, 'Registration status'),
    });
  });
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const status = await auth.getRegistrationStatus();
  same(status, { registered: false, userId: '42' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:5000/v1/auth/status');
});

test('parses the registered status envelope into a profile', async () => {
  const { client, auth } = harness(() =>
    response({
      body: successBody({
        registered: true, userId: '42', identityId: 'idn_1', name: 'Alice', avatarUrl: null,
      }),
    }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const status = await auth.getRegistrationStatus();
  same(status, {
    registered: true, userId: '42', identityId: 'idn_1', name: 'Alice', avatarUrl: null,
  });
});

test('rejects malformed status responses instead of guessing', async () => {
  const { client, auth } = harness(() =>
    response({ body: successBody({ registered: true, userId: '42' }) }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  await assert.rejects(auth.getRegistrationStatus(), (error) => {
    assert.equal(error.code, 'invalid-response');
    return true;
  });
});

test('HTTP errors keep status, server message, and result payload', async () => {
  const { client, auth } = harness(() =>
    response({
      status: 413,
      body: JSON.stringify({ status: 'error', message: 'Image too large', result: { maxBytes: 2097152 } }),
    }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  await assert.rejects(auth.getProfile(), (error) => {
    assert.equal(error.code, 'http');
    assert.equal(error.status, 413);
    assert.equal(error.message, 'Image too large');
    assert.equal(error.serverMessage, 'Image too large');
    assert.deepEqual(error.result, { maxBytes: 2097152 });
    return true;
  });
});

test('a 200 error envelope is treated as a failure', async () => {
  const { client, auth } = harness(() =>
    response({ body: JSON.stringify({ status: 'error', message: 'Nope' }) }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  await assert.rejects(auth.getRegistrationStatus(), (error) => {
    assert.equal(error.message, 'Nope');
    return true;
  });
});

test('network failures are reported as network errors', async () => {
  const { client, auth } = harness(() => {
    throw new TypeError('fetch failed');
  });
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  await assert.rejects(auth.getRegistrationStatus(), (error) => {
    assert.equal(error.code, 'network');
    return true;
  });
});

test('requests time out instead of hanging', async () => {
  // Never resolves on its own; rejects when the client aborts on timeout.
  const fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    });
  const cache = new Map();
  const client = loadSource('client.ts', {}, { fetch }, cache);
  loadSource('auth.ts', {}, { fetch }, cache);
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  await assert.rejects(
    client.apiRequest('/auth/status', { user: true, timeoutMs: 5 }),
    (error) => {
      assert.equal(error.code, 'timeout');
      return true;
    },
  );
});

test('caller aborts propagate as AbortError, not API errors', async () => {
  const fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    });
  const cache = new Map();
  const client = loadSource('client.ts', {}, { fetch }, cache);
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const controller = new AbortController();
  const pending = client.apiRequest('/auth/status', { user: true, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => {
    assert.equal(error.name, 'AbortError');
    assert.equal(error instanceof client.ApiError, false);
    return true;
  });
  assert.equal(client.isAbortError(await pending.catch((error) => error)), true);
});

test('requests requiring a user fail fast without a signed-in user', async () => {
  let called = false;
  const { client, auth } = harness(() => {
    called = true;
    return response({ body: successBody({}) });
  });
  client.configureApi('http://localhost:5000');
  client.setApiUserId(null);
  await assert.rejects(auth.getProfile(), (error) => {
    assert.equal(error.code, 'unauthenticated');
    return true;
  });
  assert.equal(called, false);
});

test('registration without a photo posts JSON with current userId, address and name', async () => {
  const { calls, client, auth } = harness((_url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.headers['X-User-Id'], undefined);
    assert.deepEqual(JSON.parse(init.body), { userId: '42', address: 'GABC', name: 'Alice' });
    return response({
      body: successBody(
        { userId: '42', identityId: 'idn_1', name: 'Alice', avatarUrl: null, addresses: ['GABC'] },
        'Auth provider user registered',
      ),
    });
  });
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const profile = await auth.registerAccount({ address: 'GABC', name: '  Alice  ' });
  same(profile, {
    userId: '42', identityId: 'idn_1', name: 'Alice', avatarUrl: null, addresses: ['GABC'],
  });
  assert.equal(calls[0].url, 'http://localhost:5000/v1/auth/register');
});

test('registration with a photo stays within the API two-field and three-part upload limits', async () => {
  const { calls, client, auth } = harness(() =>
    response({
      body: successBody({
        userId: '42', identityId: 'idn_1', name: 'Alice', avatarUrl: '/files/a.png', addresses: [],
      }),
    }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const file = new File([new Uint8Array(140000)], 'avatar.png', { type: 'image/png' });
  const profile = await auth.registerAccount({ address: 'GABC', name: 'Alice', avatar: file });
  assert.equal(profile.avatarUrl, '/files/a.png');
  const init = calls[0].init;
  assert.equal(init.headers['Content-Type'], undefined);
  assert.ok(init.body instanceof FormData);
  const entries = [...init.body.entries()];
  assert.deepEqual(
    entries.map(([key]) => key).sort(),
    ['avatar', 'name', 'userId'],
  );
  assert.equal(init.body.get('userId'), '42');
  assert.equal(init.body.get('address'), null);
  assert.equal(entries.filter(([, value]) => typeof value === 'string').length, 2);
  assert.equal(init.body.get('name'), 'Alice');
  assert.equal(init.body.get('avatar').name, 'avatar.png');
});

test('avatar update and removal call the user avatar endpoint', async () => {
  const methods = [];
  const { calls, client, auth } = harness((_url, init) => {
    methods.push(init.method);
    return response({ body: successBody({ identityId: 'idn_1', name: 'Alice', avatarUrl: '/new.png' }) });
  });
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  const file = new File([new Uint8Array(140000)], 'avatar.png', { type: 'image/png' });
  await auth.uploadAvatar(file);
  await auth.deleteAvatar();
  assert.deepEqual(methods, ['PUT', 'DELETE']);
  assert.equal(calls[0].url, 'http://localhost:5000/v1/user/avatar');
  assert.equal(calls[0].init.headers['X-User-Id'], '42');
  assert.deepEqual([...calls[0].init.body.keys()], ['avatar']);
  assert.equal(calls[1].init.headers['X-User-Id'], '42');
});

test('profile responses validate their shape', async () => {
  const { client, auth } = harness(() =>
    response({ body: successBody({ identityId: 'idn_1', name: 'Alice', avatarUrl: null }) }),
  );
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  same(await auth.getProfile(), {
    identityId: 'idn_1', name: 'Alice', avatarUrl: null,
  });
});


test('profile updates send one authenticated multipart request with only supplied fields', async () => {
  const file = new File([new Uint8Array(1024)], 'avatar.png', { type: 'image/png' });
  for (const input of [{ name: '  New name  ' }, { avatar: file }, { name: '  New name  ', avatar: file }]) {
    const { calls, client, auth } = harness(() => response({ body: successBody({ identityId: 'idn_1', name: 'New name', avatarUrl: '/updated.webp' }) }));
    client.configureApi('http://localhost:5000');
    client.setApiUserId('42');
    same(await auth.updateProfile(input), { identityId: 'idn_1', name: 'New name', avatarUrl: '/updated.webp' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://localhost:5000/v1/user/avatar');
    const { init } = calls[0];
    assert.equal(init.method, 'PUT');
    assert.equal(init.headers['X-User-Id'], '42');
    assert.equal(init.headers['Content-Type'], undefined);
    assert.ok(init.body instanceof FormData);
    assert.deepEqual([...init.body.keys()].sort(), Object.keys(input).sort());
    if (input.name) assert.equal(init.body.get('name'), 'New name');
    if (input.avatar) assert.equal(init.body.get('avatar').name, 'avatar.png');
  }
});

test('profile updates validate trimmed names and require a changed field before making a request', async () => {
  const { calls, client, auth } = harness(() => response({ body: successBody({ identityId: 'idn_1', name: 'A'.repeat(80), avatarUrl: null }) }));
  client.configureApi('http://localhost:5000'); client.setApiUserId('42');
  for (const input of [{}, { name: '' }, { name: '   ' }, { name: 'A'.repeat(81) }]) await assert.rejects(auth.updateProfile(input));
  assert.equal(calls.length, 0);
  await auth.updateProfile({ name: '  ' + 'A'.repeat(80) + '  ' });
  assert.equal(calls[0].init.body.get('name').length, 80);
});

test('profile mutations normalize nullable names and reject invalid responses and API errors', async () => {
  for (const result of [{ identityId: 'idn_1', name: null, avatarUrl: null }, { identityId: '', name: 'A', avatarUrl: null }, { identityId: 'idn_1', name: 7, avatarUrl: null }]) {
    const { client, auth } = harness(() => response({ body: successBody(result) }));
    client.configureApi('http://localhost:5000'); client.setApiUserId('42');
    if (result.name === null) same(await auth.updateProfile({ name: 'A' }), { identityId: 'idn_1', name: '', avatarUrl: null });
    else await assert.rejects(auth.updateProfile({ name: 'A' }), error => error.code === 'invalid-response');
  }
  const { client, auth } = harness(() => response({ status: 400, body: JSON.stringify({ status: 'error', message: 'That name is not available.' }) }));
  client.configureApi('http://localhost:5000'); client.setApiUserId('42');
  await assert.rejects(auth.updateProfile({ name: 'Alice' }), error => error.message === 'That name is not available.');
});
