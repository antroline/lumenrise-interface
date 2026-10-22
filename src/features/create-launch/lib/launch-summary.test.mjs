import { configurationModule, networkModule } from '../../../configuration-fixture.mjs';
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
  if (path.replaceAll('\\', '/').endsWith('/lib/api/config.ts')) return configurationModule;
  if (path.replaceAll('\\', '/').endsWith('/lib/stellar/network.ts')) return networkModule;
  if (modules.has(path)) return modules.get(path);
  const module = { exports: {} };
  modules.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, URLSearchParams, URL,
    require: (name) => name === '@/lib/api/config' ? configurationModule : name === '@/lib/stellar/network' ? networkModule : loadSource(resolve(dirname(path), `${name}.ts`)),
  }, { filename: path });
  return module.exports;
}

const { initialLaunchDraft } = loadSource('launch-draft.ts');
const { launchSummaryRows } = loadSource('launch-summary.ts');
const { launchStages, launchStageIndex, validateLaunchStage } = loadSource('launch-stages.ts');
const rowsFor = (draft, step) => JSON.parse(JSON.stringify(launchSummaryRows(draft, step)));

test('start summary follows the schedule toggle without discarding the selected date', () => {
  const draft = structuredClone(initialLaunchDraft);
  assert.equal(rowsFor(draft, 'settings')[0].value, 'Immediately');
  draft.bonding.scheduleEnabled = true;
  assert.equal(rowsFor(draft, 'settings')[0].value, 'Not selected');
  draft.bonding.startsAt = '2030-01-02T07:00:00+03:00';
  const scheduled = rowsFor(draft, 'settings')[0].value;
  assert.notEqual(scheduled, 'Not selected');
  draft.bonding.scheduleEnabled = false;
  assert.equal(rowsFor(draft, 'settings')[0].value, 'Immediately');
  assert.equal(draft.bonding.startsAt, '2030-01-02T07:00:00+03:00');
  draft.bonding.scheduleEnabled = true;
  assert.equal(rowsFor(draft, 'settings')[0].value, scheduled);
});

test('project stage accepts optional links and validates provided HTTPS URLs', () => {
  const stage = launchStages[launchStageIndex('project')];
  const draft = { ...structuredClone(initialLaunchDraft),
    website: ' https://example.com ', xAccount: ' https://x.com/project ' };
  let errors = validateLaunchStage(draft, stage);
  assert.equal(errors['launch-website'], undefined);
  assert.equal(errors['launch-x'], undefined);
  for (const [field, errorKey] of [['website', 'launch-website'], ['xAccount', 'launch-x']]) {
    for (const value of ['', '   ']) {
      errors = validateLaunchStage({ ...draft, [field]: value }, stage);
      assert.equal(errors[errorKey], undefined);
    }
    for (const value of ['http://example.com', 'invalid', '/relative',
      'https://user:password@example.com', `https://example.com/${'a'.repeat(2029)}`]) {
      errors = validateLaunchStage({ ...draft, [field]: value }, stage);
      assert.ok(errors[errorKey], `${field}: ${value}`);
    }
    errors = validateLaunchStage({ ...draft, [field]: `https://example.com/${'a'.repeat(2028)}` }, stage);
    assert.equal(errors[errorKey], undefined);
  }
});

test('empty identity and unselected method do not generate placeholder summary facts', () => {
  assert.deepEqual(rowsFor(initialLaunchDraft, 'project'), []);
  assert.deepEqual(rowsFor({ ...initialLaunchDraft, methodSelected: false }, 'method'), []);
  assert.deepEqual(rowsFor({ ...initialLaunchDraft, name: '  Project  ' }, 'project'), [
    { label: 'Name', value: 'Project' },
  ]);
});

const { calculateLaunch, calculateDraftLaunch, launchPreview } = loadSource('calculate-launch.ts');
const { validateLaunchStep } = loadSource('launch-validation.ts');

test('participation follows tokenomics and the launch plan before review', () => {
  assert.equal(launchStages.length, 4);
  assert.equal(launchStages.map((stage) => stage.id).join(), 'project,token,eligibility,review');
  assert.equal(launchStageIndex('eligibility'), 2);
  for (const section of ['method', 'sale', 'supply', 'allocation', 'settings', 'token'])
    assert.equal(launchStageIndex(section), 1, section);
  assert.equal(launchStageIndex('review'), 3);
  const draft = structuredClone(initialLaunchDraft);
  draft.bonding.creatorPayout = '0.1';
  draft.bonding.creatorFee = '10.01';
  draft.allocation.teamShare = '100';
  draft.quote = 'XLM';
  const errors = validateLaunchStage(draft, launchStages[1]);
  assert.ok(errors['creator-payout']);
  assert.ok(errors['creator-fee']);
  assert.ok(errors['allocation-team']);
  assert.ok(errors['launch-quote']);
  // Focus goes to the first error, so error order must follow the on-screen order.
  assert.equal(Object.keys(errors)[0], 'launch-quote');
});

test('minimum reserve, payout cap, tax estimates and rounded price growth follow the formula', () => {
  for (const payout of [0, 0.5, 0.99, 50, 499.99, 500, 1000, 1234.5678901]) {
    const c = calculateLaunch(100_000_000, payout, 250, 1000);
    assert.ok(c.graduationTarget >= 5000);
    assert.ok(c.creatorPayoutBps <= 1000);
    assert.ok(Math.abs(c.graduationTarget * c.creatorPayoutBps / 10000 - payout) < 1e-9);
    assert.equal(Object.values(c.allocations).reduce((a,b) => a+b), 10000);
    assert.equal(c.buyOnlyCreatorTaxEstimate, c.graduationTarget * 0.025);
    assert.equal(c.buyOnlyBuyerSpendEstimate, c.graduationTarget * 1.025);
    assert.ok(Math.abs(c.actualPriceMultiplier - 10) < 0.01);
    assert.ok(Math.abs(c.graduationPrice / c.poolPrice - 1) < 1e-12);
  }
  assert.equal(calculateLaunch(1e8, 0, 0, 0).creatorPayoutBps, 0);
  assert.equal(calculateLaunch(1e8, 1000, 0, 0).graduationTarget, 10000);
  assert.throws(() => calculateLaunch(1e8, 0.49, 0, 0));
  for (const args of [[0, 0, 0, 0], [NaN, 0, 0, 0], [1e8, -1, 0, 0], [1e8, Infinity, 0, 0], [1e8, 0, 1001, 0], [1e8, 0, 1.5, 0], [1e8, 0, 0, 10000], [1e8, 0, 0, 9999]])
    assert.throws(() => calculateLaunch(...args));
});

test('tax is separate from payout, allocation and curve calibration', () => {
  const noTax = calculateLaunch(1e8, 250, 0, 1500);
  const tax = calculateLaunch(1e8, 250, 1000, 1500);
  for (const key of ['graduationTarget', 'creatorPayoutBps', 'poolQuote', 'virtualBaseReserve', 'virtualQuoteReserve', 'startPrice'])
    assert.equal(noTax[key], tax[key]);
  assert.deepEqual(JSON.parse(JSON.stringify(noTax.allocations)), JSON.parse(JSON.stringify(tax.allocations)));
});

test('deployment retains exact supply units and reaches graduation with whole-unit reserves', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.supply = '900719925.4740993';
  draft.bonding.creatorPayout = '1234.5678901';
  draft.allocation.teamShare = '30';
  const c = calculateDraftLaunch(draft);
  const inventory = 9007199254740993n * BigInt(c.allocations.curve_bps) / 10000n;
  const base = BigInt(c.contract.virtual_base_reserve), quote = BigInt(c.contract.virtual_quote_reserve);
  const target = BigInt(c.contract.graduation_target);
  assert.equal(target, 123456789010n);
  assert.ok(base > inventory);
  const cost = (quote * inventory + base - inventory - 1n) / (base - inventory);
  assert.ok(cost >= target && cost - target <= 3n);
  assert.equal(rowsFor(draft, 'token')[0].value, '900,719,925.4740993');
  draft.supply = '0.0000001';
  assert.equal(launchPreview(draft).calculation, null);
  draft.supply = '0.0000003';
  assert.equal(launchPreview(draft).calculation, null);
  draft.supply = '922337203685.4775807';
  draft.allocation.teamShare = '0';
  assert.match(launchPreview(draft).error, /contract amount limit/);
});

test('summary derives shares and target, ignores legacy manual allocations and hides invalid previews', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.allocation.saleShare = 'invalid';
  draft.allocation.poolShare = 'invalid';
  const c = calculateDraftLaunch(draft);
  const rows = rowsFor(draft, 'token');
  assert.equal(rows.find(row => row.label === 'Bonding curve').value, `${c.allocations.curve_bps / 100}%`);
  assert.equal(rows.find(row => row.label === 'Creator Raise').value, '$0');
  assert.equal(rows.find(row => row.label === 'Creator Tax').value, '0%');
  assert.equal(rows.find(row => row.label === 'Graduation target').value, '$5,000');
  assert.equal(rowsFor(draft, 'sale')[0].value, '$5,000 USDC');
  draft.bonding.creatorPayout = '';
  assert.deepEqual(rowsFor(draft, 'allocation'), []);
  assert.deepEqual(rowsFor(draft, 'sale'), []);
});

test('team vesting stays conditional and tax accepts only whole basis points up to 10%', () => {
  const draft = structuredClone(initialLaunchDraft);
  draft.allocation.vestingMonths = 'invalid';
  assert.equal(validateLaunchStep(draft, 'allocation')['team-vesting'], undefined);
  draft.allocation.teamShare = '10';
  assert.ok(validateLaunchStep(draft, 'allocation')['team-vesting']);
  draft.allocation.vestingMonths = '0';
  assert.equal(rowsFor(draft, 'allocation').at(-1).value, 'No vesting');
  for (const value of ['0', '0.01', '1.25', '10']) {
    draft.bonding.creatorFee = value;
    assert.equal(validateLaunchStep(draft, 'allocation')['creator-fee'], undefined);
  }
  for (const value of ['', '-1', '10.01', '1.001', 'abc']) {
    draft.bonding.creatorFee = value;
    assert.ok(validateLaunchStep(draft, 'allocation')['creator-fee']);
  }
});
