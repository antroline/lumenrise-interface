import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('./launch-studio.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function studioHarness(status) {
  const states = [];
  let cursor = 0;
  let cleanup;
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
    '@/lib/launchpad': { useLaunchpad: () => ({ notify() {}, accountReady: true }) },
    '../hooks/use-bonding-launch': {
      useBondingLaunch: () => ({ operation: status ? { status } : null, working: false }),
    },
    '../lib/launch-draft': { initialLaunchDraft: { method: 'bonding' } },
    '../lib/bonding-curve': {},
    '../lib/launch-stages': { launchStages: [{ id: 'project', label: 'Project' }] },
    './launch-summary': { LaunchSummary: 'LaunchSummary' },
    './launch-stepper': { LaunchStepper: 'LaunchStepper' },
    './launch-step-content': { LaunchStepContent: 'LaunchStepContent' },
    './launch-navigation': { LaunchNavigation: 'LaunchNavigation' },
    './launch-operation-dialog': { LaunchOperationDialog: 'LaunchOperationDialog' },
    './launch-motion': { LaunchMotionConfig: 'LaunchMotionConfig', LaunchStepPanel: 'LaunchStepPanel' },
  };
  runInNewContext(source, {
    module, exports: module.exports,
    require(name) {
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
  return { first, render, cleanup: () => cleanup };
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
