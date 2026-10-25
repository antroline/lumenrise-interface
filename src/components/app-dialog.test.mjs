import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });

function harness({ reduced = false, animateSize = true, nativeAnimation = true } = {}) {
  const animations = [], listeners = new Map(), attributes = new Set();
  let contentHeight = 160, maxHeight = 500, visibleHeight, observer, disconnected = false;
  const popup = {
    style: { removeProperty(name) { delete this[name]; } },
    hasAttribute: name => attributes.has(name),
    animate: nativeAnimation ? (frames, options) => {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      const animation = {
        frames, options, finished, canceled: false,
        finish() { visibleHeight = undefined; resolve(); },
        cancel() { this.canceled = true; visibleHeight = undefined; reject(new Error('Canceled')); },
      };
      animations.push(animation);
      return animation;
    } : undefined,
  };
  const viewport = { parentElement: popup, dataset: {} };
  const body = { parentElement: viewport };
  const styles = node => node === body ? { height: `${contentHeight}px` } : {
    height: `${visibleHeight ?? Math.min(parseFloat(popup.style.height ?? '200'), maxHeight)}px`,
    paddingTop: '20px', paddingBottom: '20px', borderTopWidth: '0px', borderBottomWidth: '0px',
    maxHeight: `${maxHeight}px`,
  };
  const mocks = {
    react: { useCallback: fn => fn },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'motion/react': { useReducedMotion: () => reduced },
    '@/components/ui/dialog': { DialogContent: 'DialogContent' },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    './app-dialog.module.css': { default: {} },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('./app-dialog.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, getComputedStyle: styles,
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    ResizeObserver: class {
      constructor(callback) { observer = callback; }
      observe(element) { assert.equal(element, body); }
      disconnect() { disconnected = true; }
    },
    require(name) { assert.ok(name in mocks, name); return mocks[name]; },
  });
  const tree = module.exports.AppDialogContent({ animateSize });
  const cleanup = tree.props.children.props.children.props.ref(body);
  return {
    popup, viewport, animations, attributes, listeners, cleanup, tree,
    disconnected: () => disconnected,
    resize(height, cap = maxHeight) { contentHeight = height; maxHeight = cap; observer?.(); },
    visible(height) { visibleHeight = height; },
  };
}

test('shared sizing mounts at its natural size and ignores subpixel measurement noise', () => {
  const h = harness();
  h.resize(160);
  h.resize(160.25);
  assert.equal(h.popup.style.height, '200px');
  assert.equal(h.animations.length, 0);
  h.cleanup();
});

test('resizes settle at the new height and release transient overflow suppression', async () => {
  const h = harness();
  h.resize(260);
  assert.equal(h.popup.style.height, '300px');
  assert.equal(h.viewport.dataset.resizing, '');
  assert.equal(JSON.stringify(h.animations[0].frames.height), JSON.stringify(['200px', '300px']));
  h.animations[0].finish();
  await Promise.resolve();
  assert.equal(h.viewport.dataset.resizing, undefined);
  h.cleanup();
});

test('rapid interruption starts at the visible height and old completion cannot clear the new transition', async () => {
  const h = harness();
  h.resize(260);
  h.visible(245);
  h.resize(180);
  assert.equal(h.animations[0].canceled, true);
  assert.equal(JSON.stringify(h.animations[1].frames.height), JSON.stringify(['245px', '220px']));
  await Promise.resolve();
  assert.equal(h.viewport.dataset.resizing, '');
  h.animations[1].cancel();
  await Promise.resolve();
  assert.equal(h.viewport.dataset.resizing, undefined);
  h.cleanup();
});

test('viewport-capped content keeps real scrolling enabled and responds to viewport resizing', () => {
  const h = harness();
  h.resize(900);
  assert.equal(h.popup.style.height, '500px');
  assert.equal(h.viewport.dataset.resizing, undefined);
  h.resize(900, 300);
  assert.equal(h.popup.style.height, '300px');
  assert.equal(h.viewport.dataset.resizing, undefined);
  h.cleanup();
});

test('closing does not retarget height; unmount cancels animation and removes measurements and listeners', async () => {
  const h = harness();
  h.resize(260);
  h.attributes.add('data-closed');
  h.resize(80);
  assert.equal(h.popup.style.height, '300px');
  h.cleanup();
  await Promise.resolve();
  assert.equal(h.animations[0].canceled, true);
  assert.equal(h.popup.style.height, undefined);
  assert.equal(h.viewport.dataset.resizing, undefined);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.disconnected(), true);
});

test('reduced motion and explicit opt-out keep CSS natural sizing without an observer', () => {
  for (const options of [{ reduced: true }, { animateSize: false }]) {
    const h = harness(options);
    assert.equal(h.cleanup, undefined);
    assert.equal(h.popup.style.height, undefined);
    assert.equal(h.listeners.size, 0);
  }
});

test('opening and browsers without native animation apply size without a transient scroll lock', () => {
  for (const options of [{}, { nativeAnimation: false }]) {
    const h = harness(options);
    if (options.nativeAnimation !== false) h.attributes.add('data-starting-style');
    h.resize(280);
    assert.equal(h.popup.style.height, '320px');
    assert.equal(h.animations.length, 0);
    assert.equal(h.viewport.dataset.resizing, undefined);
    h.cleanup();
  }
});
