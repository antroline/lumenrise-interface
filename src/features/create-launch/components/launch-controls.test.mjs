import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, mocks = {}) {
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports,
    require: name => mocks[name] ?? (name === 'react/jsx-runtime'
      ? { jsx, jsxs: jsx }
      : new Proxy({}, { get: (_, key) => key })),
  });
  return module.exports;
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

const { LaunchStepContent } = load('./launch-step-content.tsx');
const methodChoiceFor = blockchain => load('./method-choice.tsx', {
  '@/lib/networks/context': { useNetwork: () => ({ activeNetwork: { blockchain } }) },
}).MethodChoice;
const MethodChoice = methodChoiceFor('base');
const { MethodCard } = load('./method-card.tsx', {
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  '../lib/launch-draft': { methodLabels: { bonding: 'Bonding Curve', fixed: 'Fixed Price', auction: 'Auction' } },
});

for (const method of ['bonding', 'fixed', 'auction']) {
  test(`selecting ${method} preserves its highlight while executing as bonding`, () => {
    const schedule = { startsAt: '2030-01-01T12:00:00Z', scheduleEnabled: true };
    let draft = { method: 'bonding', methodSelected: true, bonding: schedule, quote: 'USDC' };
    const render = () => LaunchStepContent({ stage: { id: 'token' }, draft, setDraft: update => { draft = update(draft); } });
    const choice = nodes(render()).find(node => node.type === 'MethodChoice');
    const card = nodes(MethodChoice(choice.props)).find(node => node.type === 'MethodCard' && node.props.method === method);
    const button = MethodCard(card.props);
    assert.notEqual(button.props.disabled, true);
    assert.ok(!JSON.stringify(button).includes('Coming soon'));
    button.props.onClick();
    assert.equal(draft.method, 'bonding');
    assert.equal(draft.methodChoice, method);
    assert.equal(draft.quote, 'USDC');
    assert.equal(draft.bonding, schedule);
    const selected = nodes(render()).find(node => node.type === 'MethodChoice');
    assert.equal(selected.props.selected, method);
    assert.ok(nodes(render()).some(node => node.type === 'LaunchOutcomePreview'));
  });
}

const { StartDateField } = load('./launch-fields/start-date-field.tsx', {
  '../../lib/launch-validation': { launchStartError: () => undefined },
  '../launch-motion': { LaunchReveal: 'LaunchReveal' },
});

test('Stellar keeps Fixed Price and Auction disabled and marks them Coming soon', () => {
  const StellarMethodChoice = methodChoiceFor('stellar');
  const choices = [];
  const tree = StellarMethodChoice({ selected: 'auction', onChoose: method => choices.push(method) });
  for (const card of nodes(tree).filter(node => node.type === 'MethodCard')) {
    const button = MethodCard(card.props);
    const bonding = card.props.method === 'bonding';
    assert.equal(button.props.disabled, !bonding);
    assert.equal(button.props['aria-pressed'], bonding);
    assert.equal(JSON.stringify(button).includes('Coming soon'), !bonding);
    if (bonding) button.props.onClick();
    else assert.equal(button.props.onClick, undefined);
  }
  assert.deepEqual(choices, ['bonding']);
});

test('Scheduled toggles the time picker without clearing the selected date', () => {
  let enabled = false;
  const value = '2030-01-01T12:00:00Z';
  const render = () => StartDateField({ value, enabled, onChange() {}, onEnabledChange: next => { enabled = next; } });
  const reveal = tree => nodes(tree).find(node => node.type === 'LaunchReveal');
  const toggle = tree => nodes(tree).find(node => node.type === 'Switch');
  assert.equal(reveal(render()).props.show, false);
  assert.equal(toggle(render()).props['aria-controls'], undefined);
  toggle(render()).props.onCheckedChange(true);
  assert.equal(reveal(render()).props.show, true);
  assert.equal(toggle(render()).props['aria-controls'], 'scheduled-launch-date');
  assert.equal(nodes(render()).find(node => node.type === 'DateTimePicker').props.value, value);
  toggle(render()).props.onCheckedChange(false);
  assert.equal(reveal(render()).props.show, false);
  toggle(render()).props.onCheckedChange(true);
  assert.equal(nodes(render()).find(node => node.type === 'DateTimePicker').props.value, value);
});
