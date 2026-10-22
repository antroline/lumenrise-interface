import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx = (type, props, key) => ({ type, props, key });
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: (name) => mocks[name] ?? new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }),
    ...globals,
  });
  return exports;
}
const discovery = load('./home-discovery.ts');
const external = load('../../features/launches/lib/external-url.ts', {}, { URL });
const display = load('../../lib/api/launches/display.ts');
const now = Date.parse('2026-10-23T12:00:00Z');
function render(overrides = {}, clock = now) {
  const { RecentlyLaunched } = load('./recently-launched.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: () => [clock, () => {}], useEffect: () => {} },
    '@/lib/api/launches/display': {
      ...display, displayAmount: (raw) => (BigInt(raw) / 10_000_000n).toString(),
      pairLabel: () => 'USDC',
    },
    '@/lib/connections': { shortAddress: (address) => `${address.slice(0, 4)}…${address.slice(-4)}` },
    '@/features/launches/lib/external-url': external,
    './home-discovery': discovery,
    './use-home-launches': { launchHref: (launch, network) => `/launch/${launch.contractId}?network=${network}` },
  });
  return RecentlyLaunched({
    launches: [launch], network: 'public', loaded: 1, total: 1, pending: false, failed: false, ...overrides,
  });
}
const launch = {
  contractId: 'contract', owner: 'GFOUNDERADDRESS',
  metadata: { name: 'Example', symbol: 'EX', logo: '', website: 'https://example.org', xAccount: 'https://x.com/example' },
  team: [{ kind: 'owner', address: 'GFOUNDERADDRESS', name: 'Ava', avatarUrl: '/ava.png' }],
  bonding: {
    status: 'Open', startsAt: String((now - 7_200_000) / 1000), progressBps: 4200,
    curve: { graduationTarget: '200000000000' },
    state: { quoteReserve: '84000000000', graduated: false },
  },
};
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

test('recent rows show net reserves, target, exact percent, pair and founder without a progress bar', () => {
  const tree = render();
  const content = text(tree);
  for (const value of ['8.4K / 20K', '42%', '$EX · USDC', 'Founder', 'Ava', '2h ago']) {
    assert.ok(content.includes(value), value);
  }
  const avatar = nodes(tree).find((node) => node.type === 'ProfileAvatar');
  assert.equal(avatar.props.seed, launch.owner);
  assert.equal(avatar.props.avatarUrl, '/ava.png');
  assert.equal(nodes(tree).some((node) => node.props?.role === 'progressbar'), false);
});

test('external icons remain separate from the project link and reject unsafe URLs', () => {
  const tree = render();
  const links = nodes(tree).filter((node) => node.type === 'a');
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.equal(link.props.target, '_blank');
    assert.equal(link.props.rel, 'noopener noreferrer');
    assert.ok(link.props['aria-label']);
    assert.ok(link.props.className.includes('size-11'));
  }
  const internal = nodes(tree).find((node) => node.props?.href === '/launch/contract?network=public');
  assert.equal(nodes(internal).some((node) => node.type === 'a'), false);
  const unsafe = render({ launches: [{ ...launch, metadata: { ...launch.metadata, website: 'javascript:alert(1)', xAccount: 'https://user:password@example.org' } }] });
  assert.equal(nodes(unsafe).filter((node) => node.type === 'a').length, 0);
});

test('missing founder profile falls back to the wallet and ignores other owner entries', () => {
  for (const team of [undefined, [{ kind: 'owner', address: 'GOTHER', name: 'Wrong founder' }]]) {
    const tree = render({ launches: [{ ...launch, team }] });
    assert.ok(text(tree).includes('GFOU…RESS'));
    assert.ok(!text(tree).includes('Wrong founder'));
    assert.equal(nodes(tree).find((node) => node.type === 'ProfileAvatar').props.avatarUrl, undefined);
  }
});

test('unavailable targets and outdated snapshots are explicit, not zero progress', () => {
  const tree = render({ launches: [{ ...launch, bonding: { ...launch.bonding, stateStale: true, curve: { graduationTarget: '0' } } }] });
  assert.ok(text(tree).includes('8.4K / —'));
  assert.ok(text(tree).includes('Snapshot outdated'));
  assert.ok(!text(tree).includes('42%'));
});

test('opening age handles minutes, hours and days and preserves an exact date before hydration', () => {
  for (const [elapsed, expected] of [[0, 'Just now'], [60_000, '1m ago'], [7_200_000, '2h ago'], [172_800_000, '2d ago']]) {
    const tree = render({ launches: [{ ...launch, bonding: { ...launch.bonding, startsAt: String((now - elapsed) / 1000) } }] });
    assert.equal(text(nodes(tree).find((node) => node.type === 'time')), expected);
  }
  const time = nodes(render({}, null)).find((node) => node.type === 'time');
  assert.equal(text(time), 'Oct 23, 2026');
  assert.equal(time.props.dateTime, '2026-10-23T10:00:00.000Z');
});

test('loading, failure, empty state, list limit and partial coverage remain available', () => {
  assert.ok(nodes(render({ pending: true })).some((node) => node.props?.role === 'status'));
  assert.ok(text(render({ launches: [], failed: true })).includes('could not be loaded'));
  assert.ok(text(render({ launches: [] })).includes('No launched projects'));
  assert.equal(nodes(render({ launches: Array.from({ length: 6 }, (_, index) => ({ ...launch, contractId: String(index) })) })).filter((node) => node.type === 'li').length, 5);
  assert.ok(text(render({ total: 10 })).includes('Based on 1 of 10 indexed projects'));
});

test('mobile rows hide secondary details while keeping amounts, progress and external links', () => {
  const tree = render();
  const row = nodes(tree).find((node) => node.type === 'li');
  const fields = row.props.children;
  assert.ok(fields[3].props.className.includes('hidden'));
  assert.ok(fields[3].props.className.includes('sm:flex'));
  assert.ok(fields[4].props.className.includes('hidden'));
  assert.ok(fields[4].props.className.includes('sm:block'));
  for (const field of [fields[1], fields[2], fields[5]]) {
    assert.ok(!field.props.className.split(' ').includes('hidden'));
  }
  assert.equal(nodes(fields[5]).filter((node) => node.type === 'a').length, 2);
});
