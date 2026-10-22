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
    setTimeout, clearTimeout, AbortController, FormData, DOMException, atob, Blob, File, createImageBitmap: async () => ({width: 128, height: 128, close() {}}),
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

const OWNER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const IMAGE_URL = 'https://files.example.com/tokens/testnet/img-1.png';

/** Builds the module set with a recording fetch stub and a signed-in user.
    `setHandler` swaps the response behavior without reloading the modules. */
function harness(handler) {
  const calls = [];
  const state = { handler };
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (state.handler) return state.handler(url, init);
    return response({ body: successBody({}) });
  };
  const cache = new Map();
  const client = loadSource('../client.ts', {}, { fetch }, cache);
  const images = loadSource('images.ts', {}, { fetch }, cache);
  const publicApi = loadSource('public.ts', {}, { fetch }, cache);
  client.configureApi('http://localhost:5000');
  client.setApiUserId('42');
  return {
    calls, client, images, publicApi,
    setHandler: (next) => { state.handler = next; },
  };
}

test('prelaunch posts required fields with optional links omitted and the user header', async () => {
  const h = harness(() =>
    response({
      status: 201,
      body: successBody(
        { name: 'Blue Man', slug: 'blue-man', imageId: 'img-1', publicUrl: IMAGE_URL, status: 'pending' },
        'Token image uploaded',
      ),
    }),
  );
  const image = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', {
    type: 'image/png',
  });
  const result = await h.images.uploadLaunchImage({ name: 'Blue Man',
    network: 'testnet',
    ownerAddress: OWNER,
    image,
  });
  assert.equal(h.calls.length, 1);
  const { url, init } = h.calls[0];
  assert.equal(url, 'http://localhost:5000/v1/launches/prelaunch');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['X-User-Id'], '42');
  // The multipart boundary comes from the browser, never a manual header.
  assert.equal(init.headers['Content-Type'], undefined);
  assert.deepEqual([...init.body.keys()].sort(), ['image', 'name', 'network', 'ownerAddress']);
  assert.equal(init.body.get('network'), 'testnet');
  assert.equal(init.body.get('ownerAddress'), OWNER);
  const sent = init.body.get('image');
  assert.equal(sent.name, 'logo.png');
  assert.equal(sent.type, 'image/png');
  same(result, { name: 'Blue Man', slug: 'blue-man', imageId: 'img-1', publicUrl: IMAGE_URL, status: 'pending' });
});

test('prelaunch trims optional HTTPS links without rewriting them and omits blank values', async () => {
  const h = harness(() => response({ body: successBody({ name: 'Blue Man', slug: 'blue-man', imageId: 'img-1', publicUrl: IMAGE_URL, status: 'pending' }) }));
  const image = new File(['image'], 'logo.png', { type: 'image/png' });
  const website = `https://example.com/${'a'.repeat(2028)}`;
  assert.equal(website.length, 2048);
  await h.images.uploadLaunchImage({ name: 'Blue Man', network: 'testnet', ownerAddress: OWNER, image,
    website: `  ${website}  `, xAccount: ' https://x.com/Project?ref=launch ' });
  const body = h.calls[0].init.body;
  assert.deepEqual([...body.keys()].sort(), ['image', 'name', 'network', 'ownerAddress', 'website', 'xAccount']);
  assert.equal(body.get('website'), website);
  assert.equal(body.get('xAccount'), 'https://x.com/Project?ref=launch');
  await h.images.uploadLaunchImage({ name: 'Blue Man', network: 'testnet', ownerAddress: OWNER, image,
    website: '  ', xAccount: '\t\n' });
  assert.deepEqual([...h.calls[1].init.body.keys()].sort(), ['image', 'name', 'network', 'ownerAddress']);
  for (const field of ['website', 'xAccount']) {
    await h.images.uploadLaunchImage({ name: 'Blue Man', network: 'testnet', ownerAddress: OWNER, image,
      [field]: 'https://example.com/project' });
    assert.equal(h.calls.at(-1).init.body.get(field), 'https://example.com/project');
  }
});

test('invalid prelaunch links stop before a request and display the validation message', async () => {
  for (const field of ['website', 'xAccount']) {
    for (const value of ['not a URL', '/relative', 'http://example.com', 'javascript:alert(1)',
      'https://user@example.com', 'https://:secret@example.com', 'https://user:secret@example.com',
      `https://example.com/${'a'.repeat(2029)}`]) {
      const h = harness();
      await assert.rejects(() => h.images.uploadLaunchImage({ name: 'Blue Man',
        network: 'testnet', ownerAddress: OWNER, image: new File(['image'], 'logo.png', {type:'image/png'}), [field]: value,
      }), (error) => {
        assert.match(h.images.launchImageErrorMessage(error), new RegExp(`valid ${field} link`));
        return true;
      });
      assert.equal(h.calls.length, 0);
    }
  }
});

test('upload responses with missing fields are rejected instead of guessed', async () => {
  for (const result of [
    { publicUrl: IMAGE_URL, status: 'pending' },
    { imageId: 'img-1', status: 'pending' },
    { imageId: 'img-1', publicUrl: IMAGE_URL },
    { imageId: 'img-1', publicUrl: IMAGE_URL, status: 'unknown-state' },
  ]) {
    const h = harness(() => response({ status: 201, body: successBody(result) }));
    await assert.rejects(() =>
      h.images.uploadLaunchImage({ name: 'Blue Man',
        network: 'testnet',
        ownerAddress: OWNER,
        image: new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' }),
      }),
    );
  }
});

test('upload failures map to dialog messages, including the server byte limit', async () => {
  const h = harness();
  const mapper = h.images.launchImageErrorMessage;
  const uploadError = async (status, result, message = 'Upload failed') => {
    h.setHandler(() =>
      response({
        status,
        body: JSON.stringify({ status: 'error', message, result }),
      }),
    );
    return h.images
      .uploadLaunchImage({ name: 'Blue Man',
        network: 'testnet',
        ownerAddress: OWNER,
        image: new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' }),
      })
      .catch((error) => error);
  };

  const tooLarge = await uploadError(413, { maxBytes: 5 * 1024 * 1024 }, 'Image too large');
  assert.equal(tooLarge.status, 413);
  assert.equal(mapper(tooLarge), 'That image is too large. The current limit is 5 MB.');

  const ownership = await uploadError(403, null, 'Forbidden');
  assert.match(mapper(ownership), /not linked to your account/);

  const unregistered = await uploadError(401, null, 'Unauthorized');
  assert.match(mapper(unregistered), /setting up your account/);

  const invalid = await uploadError(400, null, 'Images must be at least 128px.');
  assert.equal(mapper(invalid), 'Images must be at least 128px.');

  const unavailable = await uploadError(503, null, 'Unavailable');
  assert.match(mapper(unavailable), /storage is unavailable/);
});

test('image status reads validate the lifecycle fields and require a user', async () => {
  const info = {
    name: 'Blue Man', slug: 'blue-man',
    imageId: 'img-1',
    network: 'testnet',
    ownerAddress: OWNER,
    publicUrl: IMAGE_URL,
    status: 'finalized',
    launchContractId: 'CABC',
    assetContractId: 'CDEF',
    cleanupReadyAt: null,
    expiredAt: null,
  };
  const h = harness(() => response({ body: successBody(info) }));
  same(await h.images.getLaunchImage('img-1'), info);
  assert.equal(h.calls[0].url, 'http://localhost:5000/v1/launches/prelaunch/img-1');
  assert.equal(h.calls[0].init.headers['X-User-Id'], '42');

  const signedOut = harness(() => response({ body: successBody(info) }));
  signedOut.client.setApiUserId(null);
  await assert.rejects(() => signedOut.images.getLaunchImage('img-1'));

  const malformed = harness(() =>
    response({ body: successBody({ ...info, status: 'archived' }) }),
  );
  await assert.rejects(() => malformed.images.getLaunchImage('img-1'));
});

test('the indexed launch lookup is public and carries the network query', async () => {
  const h = harness(() => response({ body: successBody({ contractId: 'CABC' }) }));
  h.client.setApiUserId(null);
  await h.publicApi.getIndexedLaunch('blue-man', { network: 'testnet' });
  assert.equal(h.calls[0].url, 'http://localhost:5000/v1/launches/blue-man?network=testnet');
  assert.equal(h.calls[0].init.method, 'GET');
  assert.equal(h.calls[0].init.headers['X-User-Id'], undefined);

  const missing = harness(() =>
    response({ status: 404, body: JSON.stringify({ status: 'error', message: 'Launch not found' }) }),
  );
  const error = await missing.publicApi
    .getIndexedLaunch('blue-man', { network: 'testnet' })
    .catch((cause) => cause);
  assert.equal(error.status, 404);
  assert.equal(error.serverMessage, 'Launch not found');
});

test('data URLs convert back into image files for the multipart upload', () => {
  const h = harness();
  const png = h.images.fileFromDataUrl('data:image/png;base64,iVBORw0KGgo=');
  assert.equal(png.name, 'logo.png');
  assert.equal(png.type, 'image/png');
  assert.equal(png.size, 8);
  const webp = h.images.fileFromDataUrl('data:image/webp;base64,UklGRgIAAA==');
  assert.equal(webp.name, 'logo.webp');
  const jpeg = h.images.fileFromDataUrl('data:image/jpeg;base64,/9j/4AAQ');
  assert.equal(jpeg.name, 'logo.jpg');
  for (const invalid of ['', 'https://example.com/logo.png', 'data:image/gif;base64,R0lG', 'data:text/plain;base64,aGk=']) {
    assert.throws(() => h.images.fileFromDataUrl(invalid));
  }
});


test('project name rules match server normalization without changing the display name', () => {
  const { projectNameError } = loadSource('../../launch-slug.ts');
  for (const name of ['Blue Man', 'blue man', 'blue-man', 'blue   man', ' a ', 'a'.repeat(100), 'a'.repeat(99) + '!!!'])
    assert.equal(projectNameError(name), undefined);
  for (const name of ['', '   ', '!!!', '你好', 'a'.repeat(101), ' TEAM ', '--Prelaunch--'])
    assert.ok(projectNameError(name), name);
});

test('409 is a project-name conflict and keeps the submitted form intact', async () => {
  const h = harness(() => response({ status: 409, body: JSON.stringify({ status: 'error', message: 'Slug already reserved' }) }));
  const input = { name: 'Blue   Man', network: 'testnet', ownerAddress: OWNER, image: new File(['image'], 'logo.png', { type: 'image/png' }) };
  const error = await h.images.uploadLaunchImage(input).catch(error => error);
  assert.equal(error.status, 409);
  assert.match(h.images.launchImageErrorMessage(error), /project name is already taken/);
  assert.equal(input.name, 'Blue   Man');
  assert.equal(h.calls[0].init.body.get('name'), 'Blue   Man');
});

test('legacy prelaunch status retains a null slug', async () => {
  const h = harness(() => response({ body: successBody({ name: 'Blue Man', slug: null, imageId: 'legacy', publicUrl: IMAGE_URL, status: 'pending', network: 'testnet', ownerAddress: OWNER, launchContractId: null, assetContractId: null, cleanupReadyAt: null, expiredAt: null }) }));
  assert.equal((await h.images.getLaunchImage('legacy')).slug, null);
});
