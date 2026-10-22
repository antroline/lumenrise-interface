import { configurationModule, networkModule } from '../../../configuration-fixture.mjs';
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
const registered = { memberId: 'membership-1', kind: 'registered', identityId: 'identity-42', name: 'Ava', avatarUrl: null, role: 'Developer', xAccount: null };
const external = { ...registered, memberId: 'external-7', kind: 'external', identityId: null, xAccount: 'https://x.com/ava' };
const fields = { name: ' Ava ', role: ' Developer ', xAccount: ' https://x.com/ava ' };
const image = () => new File(['image'], 'ava.png', { type: 'image/png' });
const same = (value, expected) => assert.deepEqual(JSON.parse(JSON.stringify(value)), expected);

function harness({ result = {}, status = 200, bitmap = { width: 128, height: 128 } } = {}) {
  const calls = [], cache = new Map();
  let closed = 0;
  function load(filename) {
    const path = resolve(directory, filename);
  if (path.replaceAll('\\', '/').endsWith('/lib/api/config.ts')) return configurationModule;
  if (path.replaceAll('\\', '/').endsWith('/lib/stellar/network.ts')) return networkModule;
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    cache.set(path, module.exports);
    const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(output, {
      module, exports: module.exports, URLSearchParams, URL, FormData, File, AbortController, Error, setTimeout, clearTimeout,
      createImageBitmap: async () => ({ ...bitmap, close: () => closed++ }),
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: status < 400, status, text: async () => JSON.stringify({ status: status < 400 ? 'success' : 'error', message: 'Server response', result }) };
      },
      require: (name) => name === '@/lib/api/config' ? configurationModule : name === '@/lib/stellar/network' ? networkModule : name.startsWith('.') ? load(resolve(dirname(path), `${name}.ts`)) : require(name),
    }, { filename: path });
    return module.exports;
  }
  const client = load('../client.ts');
  client.configureApi('https://api.example/v1');
  client.setApiUserId('42');
  return { api: load('team.ts'), client, calls, closed: () => closed };
}

test('team reads both member kinds, keeps distinct mutation identifiers, and authenticates with network', async () => {
  const h = harness({ result: { members: [registered, external] } });
  same(await h.api.getLaunchTeam('launch/id', { network: 'public' }), [registered, external]);
  assert.equal(h.calls[0].url, 'https://api.example/v1/launches/launch%2Fid/team?network=public');
  assert.equal(h.calls[0].init.headers['X-User-Id'], '42');
  h.client.setApiUserId(null);
  await assert.rejects(() => h.api.getLaunchTeam('launch/id', { network: 'public' }));
  assert.equal(h.calls.length, 1);
});

test('candidate search sends a trimmed partial name or full wallet and allows missing X', async () => {
  for (const search of [' Ava ', 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF']) {
    const candidate = { identityId: 'identity-42', name: 'Ava', avatarUrl: null, xAccount: null };
    const h = harness({ result: { users: [candidate] } });
    same(await h.api.searchTeamCandidates('launch', search, { network: 'testnet' }), [candidate]);
    const url = new URL(h.calls[0].url);
    assert.equal(url.pathname, '/v1/launches/launch/team/candidates');
    assert.equal(url.searchParams.get('search'), search.trim());
    assert.equal(url.searchParams.get('network'), 'testnet');
    assert.equal(h.calls[0].init.headers['X-User-Id'], '42');
  }
});

test('candidate search reads the server users envelope without an optional X account', async () => {
  const user = {
    identityId: '6acd2b378850985ceca34c68',
    name: 'jackin',
    avatarUrl: 'https://assets.lumenrise.app/profiles/6acd2b378850985ceca34c68/5f513190-3fc4-4154-ac24-5c0c32dbaca0.webp',
  };
  const h = harness({ result: { users: [user] } });
  same(await h.api.searchTeamCandidates('launch', 'GD4W3MLPCNE7ZG3VMTU4MLXZ7Z5JOA27WV6S6PIQHFSAKVUOGVDXPWS7', { network: 'testnet' }), [{ ...user, xAccount: null }]);
});

test('candidate search distinguishes an empty user list from malformed results', async () => {
  const empty = harness({ result: { users: [] } });
  same(await empty.api.searchTeamCandidates('launch', 'missing', { network: 'testnet' }), []);
  for (const result of [{}, { users: null }, { users: {} }, { users: [{}] }, { users: [{ identityId: 'id', name: ' ' }] }]) {
    const h = harness({ result });
    await assert.rejects(() => h.api.searchTeamCandidates('launch', 'user', { network: 'testnet' }), { code: 'invalid-response' });
  }
});

test('invalid team responses fail explicitly rather than displaying an empty team', async () => {
  for (const result of [{}, { members: [{}] }, { members: [{ ...external, identityId: 'wrong' }] }, { members: [{ ...registered, kind: 'other' }] }]) {
    const h = harness({ result });
    await assert.rejects(() => h.api.getLaunchTeam('launch', { network: 'testnet' }));
  }
});

test('registered add/update uses identityId and sends only the descriptive role', async () => {
  const h = harness();
  await h.api.putRegisteredTeamMember('launch', registered.identityId, ' Developer ', { network: 'public' });
  assert.equal(h.calls[0].url, 'https://api.example/v1/launches/launch/team/identity-42?network=public');
  assert.equal(h.calls[0].init.method, 'PUT');
  assert.deepEqual(JSON.parse(h.calls[0].init.body), { role: 'Developer' });
  await assert.rejects(() => h.api.putRegisteredTeamMember('launch', registered.identityId, ' ', { network: 'public' }));
  assert.equal(h.calls.length, 1);
});

test('external add and image replacement send multipart without setting a boundary', async () => {
  for (const memberId of [undefined, 'external-7']) {
    const h = harness();
    await h.api.saveExternalTeamMember('launch', { ...fields, image: image() }, { network: 'testnet' }, memberId);
    const call = h.calls[0];
    assert.equal(call.init.method, memberId ? 'PUT' : 'POST');
    assert.equal(call.url, `https://api.example/v1/launches/launch/team/external${memberId ? '/external-7' : ''}?network=testnet`);
    assert.equal(call.init.headers['Content-Type'], undefined);
    assert.equal(call.init.headers['X-User-Id'], '42');
    assert.deepEqual([...call.init.body.keys()].sort(), ['image', 'name', 'role', 'xAccount']);
    assert.equal(call.init.body.get('name'), 'Ava');
    assert.equal(call.init.body.get('role'), 'Developer');
    assert.equal(call.init.body.get('xAccount'), 'https://x.com/ava');
    assert.equal(h.closed(), 1);
  }
});

test('external editing without a new image preserves it through JSON', async () => {
  const h = harness();
  await h.api.saveExternalTeamMember('launch', fields, { network: 'public' }, 'external-7');
  assert.equal(h.calls[0].init.method, 'PUT');
  assert.equal(h.calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(h.calls[0].init.body), { name: 'Ava', role: 'Developer', xAccount: 'https://x.com/ava' });
  assert.equal(h.closed(), 0);
});

test('external member fields and photo are mandatory; HTTPS, length and credentials are checked', async () => {
  const h = harness();
  for (const input of [
    { ...fields, name: ' ' }, { ...fields, role: ' ' }, { ...fields, xAccount: ' ' },
    ...['invalid', 'http://x.com/ava', 'https://user:pass@x.com/ava', `https://x.com/${'a'.repeat(2035)}`].map((xAccount) => ({ ...fields, xAccount })),
  ]) await assert.rejects(() => h.api.saveExternalTeamMember('launch', input, { network: 'testnet' }, 'external-7'));
  await assert.rejects(() => h.api.saveExternalTeamMember('launch', fields, { network: 'testnet' }));
  assert.equal(h.calls.length, 0);
  const xAccount = `https://x.com/${'a'.repeat(2034)}`;
  assert.equal(xAccount.length, 2048);
  assert.equal(h.api.externalMemberFields({ ...fields, xAccount }).xAccount, xAccount);
});

test('images reject unsupported formats and either undersized dimension before sending', async () => {
  const h = harness();
  await assert.rejects(() => h.api.validateTeamImage(new File(['gif'], 'ava.gif', { type: 'image/gif' })));
  for (const bitmap of [{ width: 127, height: 128 }, { width: 128, height: 127 }]) {
    const small = harness({ bitmap });
    await assert.rejects(() => small.api.saveExternalTeamMember('launch', { ...fields, image: image() }, { network: 'testnet' }), /128/);
    assert.equal(small.calls.length, 0);
    assert.equal(small.closed(), 1);
  }
  for (const type of ['image/jpeg', 'image/png', 'image/webp'])
    await h.api.validateTeamImage(new File(['image'], 'ava', { type }));
});

test('switching accounts while image validation is pending aborts before uploading', async () => {
  const h = harness();
  const controller = new AbortController();
  const save = h.api.saveExternalTeamMember('launch', { ...fields, image: image() }, { network: 'testnet', signal: controller.signal });
  controller.abort();
  await assert.rejects(() => save);
  assert.equal(h.calls.length, 0);
});

test('removal routes registered identityId and external memberId, never interchanging them', async () => {
  const h = harness();
  await h.api.removeTeamMember('launch', registered, { network: 'public' });
  await h.api.removeTeamMember('launch', external, { network: 'public' });
  assert.equal(h.calls[0].url, 'https://api.example/v1/launches/launch/team/identity-42?network=public');
  assert.equal(h.calls[1].url, 'https://api.example/v1/launches/launch/team/external/external-7?network=public');
  assert.ok(h.calls.every(({ init }) => init.method === 'DELETE' && init.headers['X-User-Id'] === '42'));
});

test('upload limits and authorization errors remain actionable', async () => {
  for (const [status, result, message] of [[413, { maxBytes: 2 * 1024 * 1024 }, /2 MB/], [413, null, /Server response/], [403, null, /Only the launch owner/], [401, null, /Sign in again/]]) {
    const h = harness({ status, result });
    const error = await h.api.saveExternalTeamMember('launch', { ...fields, image: image() }, { network: 'testnet' }).catch((cause) => cause);
    assert.match(h.api.teamErrorMessage(error), message);
  }
});
