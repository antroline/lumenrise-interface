import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const modules = new Map();
function loadSource(filename) {
  const path = resolve(directory, filename);
  if (modules.has(path)) return modules.get(path);
  const module = { exports: {} };
  modules.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports,
    require: (name) => loadSource(resolve(dirname(path), `${name}.ts`)),
  }, { filename: path });
  return module.exports;
}

const { initialLaunchDraft } = loadSource('launch-draft.ts');
const { launchSummaryRows } = loadSource('launch-summary.ts');
const { launchStages, launchStageIndex, validateLaunchStage } = loadSource('launch-stages.ts');
const rowsFor = (draft, step) => JSON.parse(JSON.stringify(launchSummaryRows(draft, step)));

test('empty identity and unselected method do not generate placeholder summary facts', () => {
  assert.deepEqual(rowsFor(initialLaunchDraft, 'project'), []);
  assert.deepEqual(rowsFor(initialLaunchDraft, 'method'), []);
  assert.deepEqual(rowsFor({ ...initialLaunchDraft, name: '  Project  ' }, 'project'), [
    { label: 'Name', value: 'Project' },
  ]);
});

test('summary keeps exact supply and target decimals beyond JavaScript safe integer precision', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.symbol = 'EXACT';
  draft.supply = '900719925.4740993';
  draft.bonding.target = '1234.5678901';
  assert.equal(rowsFor(draft, 'token')[0].value, '900,719,925.4740993 EXACT');
  assert.equal(rowsFor(draft, 'sale')[0].value, '1,234.5678901 XLM');
});

test('invalid intermediate inputs do not appear as valid summary amounts or allocations', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.supply = 'not a number';
  draft.bonding.target = '-1';
  draft.allocation.saleShare = '500';
  assert.deepEqual(rowsFor(draft, 'token'), []);
  assert.deepEqual(rowsFor(draft, 'sale'), []);
});

test('timing uses the selected duration when custom dates are empty', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.bonding.durationDays = '30';
  assert.deepEqual(rowsFor(draft, 'settings'), [
    { label: 'Starts', value: 'Immediately' },
    { label: 'Ends', value: 'After 1 month' },
    { label: 'Creator fee', value: 'Off' },
  ]);
});

test('combined token stage validates method, supply and allocation without the launch target', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.supply = '0';
  const stage = launchStages[launchStageIndex('supply')];
  const errors = validateLaunchStage(draft, stage);
  assert.ok(errors['launch-supply']);
  assert.ok(errors['launch-methods']);
  assert.equal(errors['curve-target'], undefined);
  draft.supply = '1000000';
  draft.methodSelected = true;
  draft.allocation.saleShare = 'invalid';
  assert.ok(validateLaunchStage(draft, stage)['allocation-sale']);
  assert.equal(launchStageIndex('supply'), launchStageIndex('allocation'));
});

test('launch plan validates target and dates without applying unavailable reputation rules', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.bonding.startsAt = 'invalid';
  draft.bonding.target = '-1';
  draft.eligibility.mode = 'reputation';
  const errors = validateLaunchStage(draft, launchStages[launchStageIndex('settings')]);
  assert.ok(errors['bonding-start']);
  assert.ok(errors['curve-target']);
  assert.equal(errors['eligibility-requirements'], undefined);
  assert.ok(launchStages.every((stage) => Object.keys(validateLaunchStage(draft, stage)).every((key) => !key.startsWith('eligibility'))));
});

test('review editing targets resolve to supply, allocation and launch plan; reputation is not a stage', () => {
  assert.equal(launchStages[launchStageIndex('token')].id, 'token');
  assert.equal(launchStages[launchStageIndex('allocation')].id, 'token');
  assert.equal(launchStageIndex('sale'), launchStageIndex('settings'));
  assert.equal(launchStageIndex('eligibility'), -1);
  assert.equal(launchStages[launchStageIndex('review')].id, 'review');
});
