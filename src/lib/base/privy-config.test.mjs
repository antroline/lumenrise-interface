import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { loadNetworkRegistry } from '../networks/registry.fixture.mjs';

const module = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL('./privy-config.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const chains = { base: { id: 8453 }, baseSepolia: { id: 84532 } };
runInNewContext(code, { module, exports: module.exports, require: name => {
  assert.equal(name, 'viem/chains');
  return chains;
} });
const { resolveNetwork } = loadNetworkRegistry();

for (const id of ['base-mainnet', 'base-sepolia']) test(`Privy follows the globally selected environment: ${id}`, () => {
  const network = resolveNetwork(id);
  const config = module.exports.createPrivyConfig(network, false);
  assert.equal(config.defaultChain.id, network.chainId);
  assert.deepEqual(Array.from(config.supportedChains, chain => chain.id), [network.chainId]);
  assert.deepEqual(Array.from(config.loginMethods), ['wallet', 'email']);
  assert.equal(config.embeddedWallets.ethereum.createOnLogin, 'users-without-wallets');
  assert.equal(config.appearance.walletChainType, 'ethereum-only');
  assert.equal(config.appearance.theme, 'light');
  assert.match(config.appearance.logo, /light-background/);
  assert.ok(!JSON.stringify(config).includes('secret'));
});

test('Privy appearance follows the app theme without changing the selected network', () => {
  const network = resolveNetwork('base-sepolia');
  const config = module.exports.createPrivyConfig(network, true);
  assert.equal(config.defaultChain.id, 84532);
  assert.equal(config.appearance.theme, 'dark');
  assert.match(config.appearance.logo, /dark-background/);
  assert.equal(config.appearance.accentColor, '#cbff18');
});
