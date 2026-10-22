import { networkModule } from '../../../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('./launch-studio.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function studioHarness(status, accountReady = true) {
  const states = [];
  let cursor = 0;
  let cleanup;
  let launches = 0;
  const jsx = (type, props, key) => ({ type, props, key });
  const module = { exports: {} };
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (update) => {
          states[index] = typeof update === 'function' ? update(states[index]) : update;
        }];
      },
      useCallback: (callback) => callback,
      useRef: () => ({ current: null }),
      useEffect() {},
      useLayoutEffect(effect) { cleanup = effect(); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'motion/react': { AnimatePresence: 'AnimatePresence' },
    '@/lib/launchpad': { useLaunchpad: () => ({ notify() {}, accountReady }) },
    '../hooks/use-bonding-launch': {
      useBondingLaunch: () => ({ operation: status ? { status } : null, working: status === 'running', launch() { launches++; } }),
    },
    '../lib/launch-draft': { initialLaunchDraft: { method: 'bonding' } },
    '../lib/bonding-curve': {},
    '../lib/launch-stages': { launchStages: [{ id: 'project', label: 'Project' }] },
    './launch-summary': { LaunchSummary: 'LaunchSummary' },
    './launch-stepper': { LaunchStepper: 'LaunchStepper' },
    './launch-step-content': { LaunchStepContent: 'LaunchStepContent' },
    './launch-navigation': { LaunchNavigation: 'LaunchNavigation' },
    './launch-completion': { LaunchCompletion: 'LaunchCompletion' },
    './launch-motion': { LaunchMotionConfig: 'LaunchMotionConfig', LaunchStepPanel: 'LaunchStepPanel' },
  };
  runInNewContext(source, {
    module, exports: module.exports,
    require(name) {
      if (name === '@/lib/stellar/network') return networkModule;
      assert.ok(name in mocks, `Unexpected import: ${name}`);
      return mocks[name];
    },
  });
  function render() {
    cursor = 0;
    return module.exports.LaunchStudio().props.children;
  }
  const first = render();
  first.type(first.props);
  return { first, render, cleanup: () => cleanup, launches: () => launches, content() { cursor = 1; return first.type(first.props); } };
}

test('completed launch stays visible until exit, then returning creates a fresh studio session', () => {
  const harness = studioHarness('success');
  assert.equal(harness.render().key, harness.first.key);
  assert.equal(typeof harness.cleanup(), 'function');
  harness.cleanup()();
  assert.notEqual(harness.render().key, harness.first.key);
});

test('unfinished and failed launch sessions are not reset on exit', () => {
  for (const status of [undefined, 'running', 'error']) {
    const harness = studioHarness(status);
    assert.equal(harness.cleanup(), undefined);
    assert.equal(harness.render().key, harness.first.key);
  }
});

function find(tree, type) {
  if (!tree || typeof tree !== 'object') return;
  if (tree.type === type) return tree;
  for (const child of [tree.props?.children].flat()) {
    const match = find(child, type);
    if (match) return match;
  }
}

test('Launch replaces the form with inline completion and retry preserves the same draft', () => {
  const harness = studioHarness('error');
  const before = harness.content();
  find(before, 'LaunchNavigation').props.onLaunch();
  const screen = find(harness.content(), 'LaunchCompletion');
  assert.ok(screen);
  assert.equal(find(harness.content(), 'LaunchNavigation'), undefined);
  assert.equal(harness.launches(), 1);
  screen.props.onRetry();
  assert.equal(harness.launches(), 2);
  screen.props.onBack();
  assert.ok(find(harness.content(), 'LaunchNavigation'));
  assert.equal(find(harness.content(), 'LaunchStepContent').props.draft, find(before, 'LaunchStepContent').props.draft);
});

test('signed-out Launch keeps the form visible while the existing login flow starts', () => {
  const harness = studioHarness(undefined, false);
  find(harness.content(), 'LaunchNavigation').props.onLaunch();
  assert.equal(harness.launches(), 1);
  assert.equal(find(harness.content(), 'LaunchCompletion'), undefined);
  assert.ok(find(harness.content(), 'LaunchNavigation'));
});
