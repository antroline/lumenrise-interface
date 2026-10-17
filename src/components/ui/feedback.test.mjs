import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const modules = new Map();

function load(path) {
  if (modules.has(path)) return modules.get(path);
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  runInNewContext(output, {
    module,
    exports: module.exports,
    require(name) {
      if (!name.startsWith('@/')) return require(name);
      const base = resolve(root, name.slice(2));
      return load(`${base}${name === '@/lib/utils' ? '.ts' : '.tsx'}`);
    },
  });
  modules.set(path, module.exports);
  return module.exports;
}

const { Button } = load(resolve(root, 'components/ui/button.tsx'));
const { Input } = load(resolve(root, 'components/ui/input.tsx'));
const { Alert, AlertTitle, AlertDescription } = load(resolve(root, 'components/ui/alert.tsx'));
const { notificationOptions } = load(resolve(root, 'lib/notifications.ts'));

test('loading button retains its name, blocks interaction, and hides its spinner from AT', () => {
  const html = renderToStaticMarkup(createElement(Button, { loading: true }, 'Save changes'));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /Save changes/);
  assert.match(html, /data-slot="spinner"/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /aria-label="Loading"/);
});

test('ordinary disabled and idle buttons keep their existing semantics', () => {
  const idle = renderToStaticMarkup(createElement(Button, null, 'Save'));
  assert.doesNotMatch(idle, /data-slot="spinner"|aria-busy="true"/);
  const disabled = renderToStaticMarkup(createElement(Button, { disabled: true }, 'Save'));
  assert.match(disabled, /disabled=""/);
});

test('inputs allow browser autofill by default and preserve explicit autocomplete policy', () => {
  const idle = renderToStaticMarkup(createElement(Input, { name: 'username' }));
  assert.doesNotMatch(idle, /auto[Cc]omplete="off"/);
  for (const autoComplete of ['username', 'off']) {
    const html = renderToStaticMarkup(createElement(Input, { autoComplete }));
    assert.match(html, new RegExp(`auto[Cc]omplete="${autoComplete}"`));
  }
});

test('destructive alerts announce errors and preserve consumer role overrides', () => {
  const html = renderToStaticMarkup(
    createElement(Alert, { variant: 'destructive' },
      createElement(AlertTitle, null, 'Could not save'),
      createElement(AlertDescription, null, 'Your changes are intact. Try again.')),
  );
  assert.match(html, /role="alert"/);
  assert.match(html, /data-variant="destructive"/);
  assert.match(html, /Your changes are intact/);
  assert.match(renderToStaticMarkup(createElement(Alert, null, 'Note')), /role="note"/);
  assert.match(renderToStaticMarkup(createElement(Alert, { variant: 'destructive', role: 'status' }, 'Note')), /role="status"/);
});

test('errors and warnings remain until dismissal; success and info are timed', () => {
  for (const tone of ['error', 'warning']) {
    const options = notificationOptions('Please try again', { tone });
    assert.equal(options.timeout, 0);
    assert.equal(options.priority, tone === 'error' ? 'high' : 'low');
  }
  assert.equal(notificationOptions('Copied', { tone: 'success' }).timeout, 5000);
  assert.equal(notificationOptions('Preview only').type, 'info');
});

test('long multilingual notices retain their content and get reading time', () => {
  const message = 'نمونه 中文 🪐 '.repeat(100);
  const options = notificationOptions(message);
  assert.equal(options.title, message);
  assert.equal(options.timeout, 30000);
  assert.ok(notificationOptions('x'.repeat(200)).timeout > 5000);
});

function copyAddress(writeText) {
  const messages = [];
  const module = { exports: {} };
  const path = resolve(root, 'app/reputation/_components/copy-address.tsx');
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, {
    module,
    exports: module.exports,
    navigator: { clipboard: { writeText } },
    require(name) {
      if (name === '@/lib/launchpad') return { useLaunchpad: () => ({ notify: (...args) => messages.push(args) }) };
      if (name === '@/components/ui/button') return { Button: 'button' };
      return require(name);
    },
  });
  return {
    click: module.exports.CopyAddress({ address: 'wallet-address' }).props.onClick,
    messages,
  };
}

test('clipboard feedback waits for success before announcing it', async () => {
  let complete;
  const action = copyAddress(() => new Promise(resolve => { complete = resolve; }));
  const pending = action.click();
  assert.equal(action.messages.length, 0);
  complete();
  await pending;
  assert.equal(action.messages[0][1].tone, 'success');
});

test('clipboard rejection reports an error instead of a false success', async () => {
  const action = copyAddress(async () => { throw new Error('Clipboard unavailable'); });
  await action.click();
  assert.equal(action.messages.length, 1);
  assert.equal(action.messages[0][1].tone, 'error');
});
