import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../../lib/api/config.fixture.mjs';
import { loadNetworkRegistry } from '../../lib/networks/registry.fixture.mjs';

const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const code = compile('./wallet-button.tsx');
const switcherCode = compile('./network-switcher.tsx');
const registry = loadNetworkRegistry();

const providerCode = compile('../network-provider.tsx');
for (const [from, to] of [
  ['stellar-testnet', 'base-sepolia'], ['base-sepolia', 'stellar-testnet'],
  ['stellar-mainnet', 'base-mainnet'], ['base-mainnet', 'stellar-mainnet'],
]) test(`changing blockchain preserves the environment: ${from} to ${to}`, () => {
  const destinations = [];
  const module = { exports: {} };
  runInNewContext(providerCode, {
    module, exports: module.exports,
    window: { location: { assign: href => destinations.push(href) } },
    require: name => ({
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      '@/lib/networks/registry': registry,
      '@/lib/networks/context': { NetworkContext: { Provider: 'Provider' } },
    })[name],
  });
  const tree = module.exports.NetworkProvider({ network: registry.resolveNetwork(from, configuration), config: configuration });
  tree.props.value.switchBlockchain(to.startsWith('base') ? 'base' : 'stellar');
  assert.deepEqual(destinations, ['/projects?network=' + to]);
});

test('returning from Base without Stellar configuration keeps an explicit environment for destination validation', () => {
  const destinations = [];
  const module = { exports: {} };
  runInNewContext(providerCode, {
    module, exports: module.exports,
    window: { location: { assign: href => destinations.push(href) } },
    require: name => ({
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      '@/lib/networks/registry': registry,
      '@/lib/networks/context': { NetworkContext: { Provider: 'Provider' } },
    })[name],
  });
  const config = { ...configuration, network: { ...configuration.network, supported: ['testnet'] } };
  const tree = module.exports.NetworkProvider({ network: registry.resolveNetwork('base-mainnet', config) });
  tree.props.value.switchBlockchain('stellar');
  assert.deepEqual(destinations, ['/projects?network=stellar-mainnet']);
});

function harness(network, { supported = ['testnet', 'public'], compact = false, wallet = false, showNetwork = true } = {}) {
  const config = { ...configuration, network: { ...configuration.network, supported } };
  const activeNetwork = registry.resolveNetwork(network, config);
  const switches = [], chainSwitches = [];
  const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/link': { default: 'Link' },
    '@/lib/stellar/network': { API_NETWORK: activeNetwork.apiNetwork },
    '@/lib/networks/context': { useNetwork: () => ({
      activeNetwork, networks: registry.availableNetworks(config),
      switchNetwork: id => switches.push(id), switchBlockchain: chain => chainSwitches.push(chain),
    }) },
    '@/lib/launchpad': { useLaunchpad: () => ({ isSignedIn: true, address: 'owner', account: { status: 'registered', profile: { name: 'Name', avatarUrl: null } } }) },
    '@bluxcc/react': { useBlux: () => ({ profile() {} }) },
    '@/lib/connections': { shortAddress: value => value },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    './navigation': { settingsItem: { href: '/settings' } },
  };
  function load(source) {
    const module = { exports: {} };
    runInNewContext(source, {
      module, exports: module.exports,
      require: name => mocks[name] ?? new Proxy({}, { get: (_, key) => key }),
    });
    return module.exports;
  }
  const switcher = load(switcherCode);
  mocks['./network-switcher'] = switcher;
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
  }
  const tree = wallet ? load(code).WalletButton({ showNetwork }) : switcher.NetworkSwitcher({ compact });
  return { nodes: elements(tree), switches, chainSwitches };
}

for (const id of ['stellar-testnet', 'stellar-mainnet', 'base-mainnet', 'base-sepolia']) {
  for (const compact of [false, true]) test(`network selector uses shared context without a wallet: ${id}, compact=${compact}`, () => {
    const h = harness(id, { compact });
    const trigger = h.nodes.find(node => node.type === 'DropdownMenuTrigger').props.render;
    assert.equal(trigger.props['aria-label'], 'Network: ' + registry.resolveNetwork(id, configuration).label);
    assert.notEqual(trigger.props.disabled, true);
    const group = h.nodes.find(node => node.type === 'DropdownMenuRadioGroup' && node.props['aria-label'] === 'Blockchain');
    const chain = id.startsWith('base') ? 'base' : 'stellar';
    assert.equal(group.props.value, chain);
    group.props.onValueChange('invalid');
    assert.equal(h.chainSwitches.length, 0);
    group.props.onValueChange(chain === 'base' ? 'stellar' : 'base');
    assert.deepEqual(h.chainSwitches, [chain === 'base' ? 'stellar' : 'base']);
    const environment = h.nodes.find(node => node.type === 'DropdownMenuRadioGroup' && node.props['aria-label'] === 'Network environment');
    assert.equal(environment.props.value, id);
    environment.props.onValueChange(chain === 'base' ? 'stellar-mainnet' : 'base-mainnet');
    environment.props.onValueChange('unsupported');
    assert.equal(h.switches.length, 0);
    const next = chain === 'base' ? id === 'base-mainnet' ? 'base-sepolia' : 'base-mainnet' : id === 'stellar-mainnet' ? 'stellar-testnet' : 'stellar-mainnet';
    environment.props.onValueChange(next);
    assert.deepEqual(h.switches, [next]);
  });
}

test('Stellar environment choices respect server support', () => {
  const h = harness('stellar-testnet', { supported: ['testnet'] });
  const choices = h.nodes.filter(node => node.type === 'DropdownMenuRadioItem').map(node => node.props.value);
  assert.ok(choices.includes('stellar-testnet'));
  assert.ok(!choices.includes('stellar-mainnet'));
  assert.ok(choices.includes('base'));
});

for (const network of ['testnet', 'public']) test(`Stellar wallet retains profile navigation and shared network choices: ${network}`, () => {
  const h = harness(network, { wallet: true });
  const link = h.nodes.map(node => node.props?.render).find(node => node?.props?.href?.startsWith('/settings'));
  assert.equal(link.props.href, '/settings?network=' + network);
  assert.ok(h.nodes.some(node => node.type === 'DropdownMenuRadioGroup'));
});

test('sidebar wallet omits duplicate network controls', () => {
  const h = harness('public', { wallet: true, showNetwork: false });
  assert.equal(h.nodes.some(node => node.type === 'DropdownMenuRadioGroup'), false);
});
