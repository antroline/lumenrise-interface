import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../../lib/api/config.fixture.mjs';

const code = ts.transpileModule(readFileSync(new URL('./wallet-button.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function harness(network, supported = configuration.network.supported) {
  const navigations = [], module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'Link' },
    '@/lib/stellar/network': { API_NETWORK: network },
    '@/lib/api/config': { getConfiguration: () => ({ ...configuration, network: { ...configuration.network, supported } }) },
    '@/lib/launchpad': { useLaunchpad: () => ({ isSignedIn: true, address: 'owner', account: { status: 'registered', profile: { name: 'Name', avatarUrl: null } } }) },
    '@bluxcc/react': { useBlux: () => ({ profile() {} }) },
    '@/lib/connections': { shortAddress: value => value },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    './navigation': { settingsItem: { href: '/settings' } },
  };
  runInNewContext(code, {
    module, exports: module.exports,
    window: { location: { assign: url => navigations.push(url) } },
    require: name => mocks[name] ?? new Proxy({}, { get: (_, key) => key }),
  });
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
  }
  return { nodes: elements(module.exports.WalletButton({})), navigations };
}
for (const network of ['testnet', 'public']) test(`wallet menu selects ${network} and changes the whole application network`, () => {
  const h = harness(network);
  const group = h.nodes.find(node => node.type === 'DropdownMenuRadioGroup');
  assert.equal(group.props.value, network);
  group.props.onValueChange(network);
  group.props.onValueChange('unsupported');
  assert.equal(h.navigations.length, 0);
  const other = network === 'testnet' ? 'public' : 'testnet';
  group.props.onValueChange(other);
  assert.deepEqual(h.navigations, ['/launches?network=' + other]);
  const settings = h.nodes.find(node => node.props?.href?.startsWith('/settings'));
  // Link is passed through the dropdown's render prop.
  const renderLink = h.nodes.map(node => node.props?.render).find(node => node?.props?.href?.startsWith('/settings'));
  assert.equal((settings ?? renderLink).props.href, '/settings?network=' + network);
});
test('wallet menu disables networks absent from server support', () => {
  const h = harness('testnet', ['testnet']);
  assert.equal(h.nodes.find(node => node.type === 'DropdownMenuRadioItem' && node.props.value === 'public').props.disabled, true);
  h.nodes.find(node => node.type === 'DropdownMenuRadioGroup').props.onValueChange('public');
  assert.equal(h.navigations.length, 0);
});
