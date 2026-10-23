import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../../lib/api/config.fixture.mjs';

const code = ts.transpileModule(readFileSync(new URL('./wallet-button.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const switcherCode = ts.transpileModule(readFileSync(new URL('./network-switcher.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function harness(network, supported = configuration.network.supported, walletProps = {}, switcherProps, { isReady = true } = {}) {
  const navigations = [], switches = [], events = [], module = { exports: {} };
  const networks = { mainnet: configuration.network.configurations.public.networkPassphrase, testnet: configuration.network.configurations.testnet.networkPassphrase };
  const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'Link' },
    '@/lib/stellar/network': { API_NETWORK: network },
    '@/lib/api/config': { getConfiguration: () => ({ ...configuration, network: { ...configuration.network, supported } }) },
    '@/lib/launchpad': { useLaunchpad: () => ({ isSignedIn: true, address: 'owner', account: { status: 'registered', profile: { name: 'Name', avatarUrl: null } } }) },
    '@bluxcc/react': {
      useBlux: () => ({ isReady, profile() {} }),
      useSwitchNetwork: () => ({ networks, switchNetwork: network => { switches.push(network); events.push('switch'); } }),
    },
    '@/lib/connections': { shortAddress: value => value },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    './navigation': { settingsItem: { href: '/settings' } },
  };
  const load = (source, target) => runInNewContext(source, {
    module: target, exports: target.exports,
    window: { location: { assign: url => { navigations.push(url); events.push('navigate'); } } },
    require: name => mocks[name] ?? new Proxy({}, { get: (_, key) => key }),
  });
  const switcher = { exports: {} };
  load(switcherCode, switcher);
  mocks['./network-switcher'] = switcher.exports;
  load(code, module);
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
  }
  return { nodes: elements(switcherProps ? switcher.exports.NetworkSwitcher(switcherProps) : module.exports.WalletButton(walletProps)), navigations, switches, events };
}
for (const network of ['testnet', 'public']) test(`wallet menu selects ${network} and changes the whole application network`, () => {
  const h = harness(network);
  const group = h.nodes.find(node => node.type === 'DropdownMenuRadioGroup');
  assert.equal(group.props.value, network);
  group.props.onValueChange(network);
  group.props.onValueChange('unsupported');
  assert.equal(h.navigations.length, 0);
  assert.equal(h.switches.length, 0);
  const other = network === 'testnet' ? 'public' : 'testnet';
  group.props.onValueChange(other);
  assert.deepEqual(h.navigations, ['/projects?network=' + other]);
  assert.deepEqual(h.switches, [configuration.network.configurations[other].networkPassphrase]);
  assert.deepEqual(h.events, ['switch', 'navigate']);
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
  assert.equal(h.switches.length, 0);
});

for (const compact of [false, true]) for (const network of ['testnet', 'public']) test(`sidebar switches from ${network} without a connected wallet (compact: ${compact})`, () => {
  const h = harness(network, ['testnet', 'public'], {}, { compact });
  const trigger = h.nodes.find(node => node.type === 'DropdownMenuTrigger').props.render;
  assert.equal(trigger.props['aria-label'], 'Network: ' + (network === 'public' ? 'Mainnet' : 'Testnet'));
  const group = h.nodes.find(node => node.type === 'DropdownMenuRadioGroup');
  assert.equal(group.props.value, network);
  group.props.onValueChange(network);
  group.props.onValueChange('unsupported');
  assert.equal(h.navigations.length, 0);
  assert.equal(h.switches.length, 0);
  const other = network === 'testnet' ? 'public' : 'testnet';
  group.props.onValueChange(other);
  assert.deepEqual(h.navigations, ['/projects?network=' + other]);
  assert.deepEqual(h.switches, [configuration.network.configurations[other].networkPassphrase]);
  assert.deepEqual(h.events, ['switch', 'navigate']);
});

test('sidebar network switcher disables unsupported networks', () => {
  const h = harness('public', ['public'], {}, {});
  assert.equal(h.nodes.find(node => node.type === 'DropdownMenuRadioItem' && node.props.value === 'testnet').props.disabled, true);
  h.nodes.find(node => node.type === 'DropdownMenuRadioGroup').props.onValueChange('testnet');
  assert.equal(h.navigations.length, 0);
  assert.equal(h.switches.length, 0);
});

for (const switcherProps of [undefined, {}, { compact: true }]) test(`network controls wait for Blux readiness (${JSON.stringify(switcherProps)})`, () => {
  const h = harness('testnet', ['testnet', 'public'], {}, switcherProps, { isReady: false });
  for (const item of h.nodes.filter(node => node.type === 'DropdownMenuRadioItem')) assert.equal(item.props.disabled, true);
  h.nodes.find(node => node.type === 'DropdownMenuRadioGroup').props.onValueChange('public');
  assert.deepEqual(h.switches, []);
  assert.deepEqual(h.navigations, []);
});

test('sidebar wallet omits duplicate network controls while retaining account navigation', () => {
  const h = harness('public', ['testnet', 'public'], { showNetwork: false });
  assert.equal(h.nodes.some(node => node.type === 'DropdownMenuRadioGroup'), false);
  const renderLink = h.nodes.map(node => node.props?.render).find(node => node?.props?.href?.startsWith('/settings'));
  assert.equal(renderLink.props.href, '/settings?network=public');
});
