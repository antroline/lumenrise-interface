import assert from 'node:assert/strict';
import test from 'node:test';
import { configuration } from '../api/config.fixture.mjs';
import { loadNetworkRegistry } from './registry.fixture.mjs';

const { parseNetworkId, availableNetworks, resolveNetwork, networkSwitchHref, initialNetworkSelection } = loadNetworkRegistry();

test('legacy links normalize to explicit chain and environment IDs', () => {
  for (const [input, expected] of [
    ['mainnet', 'stellar-mainnet'], ['public', 'stellar-mainnet'],
    ['testnet', 'stellar-testnet'], ['base', 'base-mainnet'],
    ['base-sepolia', 'base-sepolia'], ['stellar-testnet', 'stellar-testnet'],
    [null, null], ['stellar', null],
  ]) assert.equal(parseNetworkId(input), expected);
  for (const invalid of ['', 'ethereum', 'base-testnet', '8453'])
    assert.throws(() => parseNetworkId(invalid), /Unsupported/);
});

test('Stellar defaults, available environments, and launch capability follow server config', () => {
  const config = structuredClone(configuration);
  config.network.default = 'public';
  config.network.supported = ['public'];
  config.network.configurations.public.launchConfigured = false;
  assert.equal(resolveNetwork(null, config).id, 'stellar-mainnet');
  assert.equal(resolveNetwork('stellar', config).apiNetwork, 'public');
  assert.equal(resolveNetwork('public', config).capabilities.creation, false);
  assert.throws(() => resolveNetwork('testnet', config), /not supported/);
  assert.deepEqual(availableNetworks(config).map(n => n.id), ['stellar-mainnet', 'base-mainnet', 'base-sepolia']);
});

test('Base resolves without Stellar config and exposes reads while keeping contract writes disabled', () => {
  for (const [id, chainId] of [['base-mainnet', 8453], ['base-sepolia', 84532]]) {
    const network = resolveNetwork(id);
    assert.equal(network.blockchain, 'base');
    assert.equal(network.chainId, chainId);
    assert.equal(network.capabilities.wallet, true);
    assert.equal(network.capabilities.projects, true);
    assert.equal(network.capabilities.creation, chainId === 84532);
    assert.equal(network.capabilities.trading, chainId === 84532);
    assert.equal(network.apiNetwork, chainId === 8453 ? 'public' : 'testnet');
  }
  assert.throws(() => resolveNetwork('public'), /not supported/);
});

test('network changes leave project identifiers, filters, and transaction input out of destination URLs', () => {
  assert.equal(networkSwitchHref('base-mainnet'), '/projects?network=base-mainnet');
  assert.equal(networkSwitchHref('stellar'), '/projects?network=stellar');
});

test('project URLs respect the global selection while the directory allows explicit network changes', () => {
  for (const path of ['/projects/TOKEN', '/launches/project', '/launch/project/participate', '/auction/project']) {
    assert.equal(initialNetworkSelection('public', 'base-mainnet', path), 'base-mainnet');
    assert.equal(initialNetworkSelection('base', null, path), 'base');
    assert.throws(() => initialNetworkSelection('invalid', 'base-mainnet', path), /Unsupported/);
  }
  assert.equal(initialNetworkSelection('public', 'base-mainnet', '/projects'), 'public');
});
