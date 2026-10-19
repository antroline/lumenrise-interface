import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const module = { exports: {} };
const jsx = (type, props) => ({ type, props });
const source = ts.transpileModule(readFileSync(new URL('./launch-navigation.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { __esModule: true, default: 'Link' },
  'lucide-react': { ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUpRight: 'ArrowUpRight' },
  '@/components/ui/button': { Button: 'Button', buttonVariants: () => 'button' },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
};
runInNewContext(source, { module, exports: module.exports, require: (name) => {
  if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
  return mocks[name];
} });
const { LaunchNavigation } = module.exports;
const props = {
  step: 'review', canGoBack: true, method: 'bonding', ready: true,
  working: false, accountReady: true, onBack() {}, onNext() {}, onLaunch() {},
};
const actions = (overrides = {}) => LaunchNavigation({ ...props, ...overrides }).props.children.flat().filter(Boolean);

test('indexed success replaces launch submission with a link to the created launch, even after wallet disconnect', () => {
  const nodes = actions({ launchAddress: 'confirmed-curve', ready: false, accountReady: false });
  const link = nodes.find((node) => node.type === 'Link');
  assert.equal(link.props.href, '/launch/confirmed-curve');
  assert.ok(link.props.children.includes('View launch '));
  assert.ok(!nodes.some((node) => node.props.onClick === props.onLaunch));
});

test('unfinished launches keep the real launch action and wallet readiness check', () => {
  const action = actions({ ready: false }).find((node) => node.props.onClick === props.onLaunch);
  assert.equal(action.type, 'Button');
  assert.equal(action.props.children, 'Launch on Testnet');
  assert.equal(action.props.disabled, true);
});

test('running launches retain progress feedback and earlier steps retain Continue', () => {
  assert.equal(actions({ working: true }).find((node) => node.props.onClick === props.onLaunch).props.children, 'Launching…');
  const nodes = actions({ step: 'token', launchAddress: 'confirmed-curve' });
  assert.ok(nodes.some((node) => node.props.onClick === props.onNext));
  assert.ok(!nodes.some((node) => node.type === 'Link'));
});
