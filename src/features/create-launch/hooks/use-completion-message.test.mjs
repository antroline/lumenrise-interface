import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('./use-completion-message.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function harness(initial = 'Preparing', transitionMs = 440) {
  let now = 0;
  let cursor = 0;
  let dirty = false;
  let sequence = 0;
  let props = [initial, false, transitionMs];
  let result;
  const slots = [];
  const timers = new Map();
  const pendingEffects = [];
  const react = {
    useState(initialValue) {
      const index = cursor++;
      slots[index] ??= { value: initialValue };
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
      }];
    },
    useRef(initialValue) { const index = cursor++; return slots[index] ??= { current: initialValue }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        pendingEffects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const module = { exports: {} };
  runInNewContext(source, {
    module, exports: module.exports, require: () => react, Date: { now: () => now },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  function flush() {
    do {
      dirty = false;
      cursor = 0;
      result = module.exports.useCompletionMessage(...props);
      while (pendingEffects.length) pendingEffects.shift()();
    } while (dirty);
  }
  flush();
  return {
    get message() { return result.message; },
    get timerCount() { return timers.size; },
    update(value, immediate = false) { props = [value, immediate, transitionMs]; flush(); },
    entered() { result.onEntered(); flush(); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); flush();
      }
      now = end;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

test('transient messages are skipped and only the latest stable message is displayed', () => {
  const h = harness();
  h.advance(1000);
  h.update('Checking'); h.advance(100);
  h.update('Confirming'); h.advance(249);
  assert.equal(h.message, 'Preparing');
  h.advance(1);
  assert.equal(h.message, 'Confirming');
  h.advance(2000);
  assert.equal(h.message, 'Confirming');
});

test('normal copy remains readable for 800ms after its actual entrance finishes', () => {
  const h = harness();
  h.advance(1000);
  h.update('Confirming'); h.advance(250);
  h.advance(440); h.entered();
  h.update('Preparing next step'); h.advance(799);
  assert.equal(h.message, 'Confirming');
  h.advance(1);
  assert.equal(h.message, 'Preparing next step');
});

test('approval, error and success immediately cancel ordinary pending messages', () => {
  for (const urgent of ['Awaiting signature', 'Launch failed', 'Launch complete']) {
    const h = harness();
    h.update('Confirming'); h.advance(50);
    h.update(urgent, true);
    assert.equal(h.message, urgent);
    assert.equal(h.timerCount, 0);
    h.advance(5000);
    assert.equal(h.message, urgent);
  }
});

test('finished actionable prompts do not consume the ordinary reading hold', () => {
  const h = harness();
  h.update('Awaiting signature', true); h.advance(440); h.entered();
  h.update('Confirming'); h.advance(249);
  assert.equal(h.message, 'Awaiting signature');
  h.advance(1);
  assert.equal(h.message, 'Confirming');
});

test('reduced motion holds readable copy without adding an animation allowance', () => {
  const h = harness('Preparing', 0);
  h.update('Confirming'); h.advance(799);
  assert.equal(h.message, 'Preparing');
  h.advance(1);
  assert.equal(h.message, 'Confirming');
  h.update('Preparing next step'); h.advance(800);
  assert.equal(h.message, 'Preparing next step');
});

test('unmount cancels pending updates', () => {
  const h = harness();
  h.update('Confirming');
  assert.equal(h.timerCount, 1);
  h.unmount();
  assert.equal(h.timerCount, 0);
});
