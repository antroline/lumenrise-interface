import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx = (type, props, key) => ({ type, props, key });
function load(file, mocks = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: (name) => mocks[name] ?? new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }),
  });
  return exports;
}
const discovery = load('./home-discovery.ts');
const launch = {
  contractId: 'contract', metadata: { name: 'Example', symbol: 'EX', description: 'A project description.', logo: '' },
  bonding: {
    status: 'Open', progressBps: 1174, stateStale: false,
    buckets: { curve: '100000000000' },
    state: { sold: '11740000000', quoteReserve: '11740000000', graduated: false },
    curve: { graduationTarget: '100000000000' },
  },
};
function render(overrides = {}) {
  const query = { isPending: false, isError: false, isFetching: false, data: {}, refetch: () => {}, ...overrides.query };
  const featured = 'featured' in overrides ? overrides.featured : launch;
  const { FeaturedLaunch } = load('./featured-launch.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/stellar/network': { API_NETWORK: 'testnet' },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/lib/api/launches/display': { compactAmount: (raw) => raw, pairLabel: () => 'USDC' },
    './home-discovery': discovery,
    './use-home-launches': {
      useHomeLaunches: () => ({ query, featured }),
      launchHref: (item, network) => `/launch/${item.contractId}?network=${network}`,
      networkName: () => 'Stellar Mainnet',
      progressLabel: discovery.progressLabel,
    },
  });
  return FeaturedLaunch({ network: 'public' });
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node === 'object') return text(node.props?.children);
  return String(node);
}
const buttons = (tree) => nodes(tree).filter((node) => node.type === 'Button');

test('mobile groups project identity and places full-width actions after funding without altering desktop columns', () => {
  const tree = render();
  const title = nodes(tree).find((node) => node.type === 'h1');
  assert.equal(text(title), 'Example $EX');
  assert.ok(title.props.className.includes('col-start-2'));
  assert.ok(title.props.className.includes('md:text-big'));
  assert.ok(nodes(tree).some((node) => node.props?.className?.includes('contents md:block')));
  const actions = nodes(tree).find((node) => node.props?.className?.includes('order-3'));
  assert.ok(actions.props.className.includes('grid-cols-2'));
  assert.ok(actions.props.className.includes('md:flex'));
  const funding = nodes(tree).find((node) => node.props?.className?.includes('order-2'));
  assert.ok(funding.props.className.includes('md:order-none'));
  assert.ok(text(funding).includes('Raised'));
  assert.ok(text(funding).includes('Graduation target'));
  for (const button of buttons(tree)) {
    assert.ok(button.props.className.includes('w-full md:w-auto'));
    assert.equal(button.props.render.props.href, '/launch/contract?network=public');
  }
  const progress = nodes(tree).find((node) => node.type === 'Progress');
  assert.equal(progress.props.value, 11.74);
  assert.equal(progress.props['aria-valuetext'], '11.74% filled');
});

test('mobile hides only selection prose, keeping stale and failed refresh warnings visible', () => {
  const note = nodes(render()).find((node) => node.type === 'p' && text(node).includes('Highest progress'));
  assert.ok(note.props.className.split(' ').includes('hidden'));
  for (const overrides of [
    { featured: { ...launch, bonding: { ...launch.bonding, stateStale: true } } },
    { query: { isError: true } },
  ]) {
    const tree = render(overrides);
    const warning = nodes(tree).find((node) => node.type === 'p' && /snapshot|Refresh failed/.test(text(node)));
    assert.ok(warning);
    assert.ok(!warning.props.className.split(' ').includes('hidden'));
  }
});

test('closed or filled launches retain status and a single full-width view action', () => {
  for (const bonding of [
    { ...launch.bonding, status: 'Graduated', state: { ...launch.bonding.state, graduated: true } },
    { ...launch.bonding, progressBps: 10000 },
    { ...launch.bonding, status: 'Failed' },
  ]) {
    const tree = render({ featured: { ...launch, bonding } });
    assert.equal(buttons(tree).length, 1);
    assert.equal(text(buttons(tree)[0]), 'View Launch');
    assert.ok(buttons(tree)[0].props.className.includes('col-span-2'));
    assert.ok(text(tree).includes(bonding.status === 'Graduated' ? 'Graduation confirmed.' : 'Participation is currently unavailable.'));
  }
});

test('loading, empty, and retry states preserve behavior', () => {
  const pending = render({ query: { isPending: true } });
  assert.ok(nodes(pending).some((node) => node.props?.['aria-label'] === 'Loading featured launch'));
  const empty = render({ featured: undefined });
  assert.ok(text(empty).includes('No featured launch is available'));
  assert.equal(buttons(empty)[0].props.render.props.href, '/projects?network=public');
  let retries = 0;
  const error = render({ query: { isError: true, data: undefined, refetch: () => { retries += 1; } } });
  assert.ok(nodes(error).some((node) => node.props?.role === 'alert'));
  buttons(error)[0].props.onClick();
  assert.equal(retries, 1);
});
