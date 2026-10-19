import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./launch-description.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(description, height) {
  const state = [];
  const element = { scrollHeight: height };
  let cursor = 0, resize, cleanup, fontReady, effectPending = true, effect;
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useId: () => 'description-content',
      useRef: () => ({ current: element }),
      useState: initial => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
      },
      useEffect: callback => { if (effectPending) effect = callback; },
    },
    '@/components/ui/button': { Button: 'Button' },
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
  };
  new Function('require', 'module', 'exports', 'getComputedStyle', 'ResizeObserver', 'document', compiled)(
    name => mocks[name], module, module.exports,
    () => ({ lineHeight: '28px' }),
    class { constructor(callback) { resize = callback; } observe() {} disconnect() { resize = undefined; } },
    { fonts: { ready: { then(callback) { fontReady = callback; } } } },
  );
  function render() {
    cursor = 0;
    const tree = module.exports.LaunchDescription({ description });
    if (effectPending) { effectPending = false; cleanup = effect(); return render(); }
    const [paragraph, button] = tree.props.children;
    return { paragraph, button };
  }
  return {
    render,
    resize(nextHeight) { element.scrollHeight = nextHeight; resize(); },
    fontsLoaded(nextHeight) { element.scrollHeight = nextHeight; fontReady(); },
    unmount() { cleanup(); },
  };
}

test('short and exactly six-line descriptions have no expansion control', () => {
  for (const height of [28, 84, 168]) {
    const h = harness('Short description', height);
    assert.equal(h.render().button, false);
    h.unmount();
  }
});

test('long descriptions expand and collapse without changing content', () => {
  const description = 'First paragraph.\n\nSecond paragraph.\n' + 'https://example.com/' + 'a'.repeat(250);
  const h = harness(description, 280);
  let result = h.render();
  assert.equal(result.button.props.children, 'Read more');
  assert.equal(result.button.props['aria-expanded'], false);
  assert.equal(result.button.props['aria-controls'], result.paragraph.props.id);
  result.button.props.onClick();
  result = h.render();
  assert.equal(result.button.props.children, 'Show less');
  assert.equal(result.button.props['aria-expanded'], true);
  assert.equal(result.paragraph.props.children, description);
  result.button.props.onClick();
  assert.equal(h.render().button.props['aria-expanded'], false);
  h.unmount();
});

test('resize and font loading remeasure whether expansion is needed', () => {
  const h = harness('Responsive description', 140);
  assert.equal(h.render().button, false);
  h.resize(224);
  assert.equal(h.render().button.props.children, 'Read more');
  h.resize(168);
  assert.equal(h.render().button, false);
  h.fontsLoaded(196);
  assert.equal(h.render().button.props.children, 'Read more');
  h.unmount();
  h.fontsLoaded(28);
  assert.equal(h.render().button.props.children, 'Read more');
});
