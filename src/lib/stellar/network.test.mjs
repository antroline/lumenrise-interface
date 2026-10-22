import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../api/config.fixture.mjs';
const source = ts.transpileModule(readFileSync(new URL('./network.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load() { const module = {exports:{}}; runInNewContext(source, {module, exports:module.exports}); return module.exports; }
test('no environment or default network exists before server configuration', () => {
  const runtime = load();
  assert.equal(runtime.API_NETWORK, undefined);
  assert.equal(runtime.NETWORK, undefined);
});
for (const network of ['testnet', 'public']) test('installs all transaction settings for ' + network, () => {
  const runtime = load();
  runtime.configureNetwork(configuration, network);
  const expected = configuration.network.configurations[network];
  for (const [key, field] of Object.entries({NETWORK:'networkPassphrase',HORIZON_URL:'horizonUrl',SOROBAN_URL:'rpcUrl',FACTORY_CONTRACT_ID:'factoryContractId',HOME_DOMAIN:'homeDomain',LAUNCH_CONFIGURED:'launchConfigured'})) assert.equal(runtime[key], expected[field]);
  assert.equal(runtime.API_NETWORK, network);
  assert.throws(() => runtime.configureNetwork(configuration, network === 'public' ? 'testnet' : 'public'), /Reload/);
});
test('missing selected RPC fails instead of using another network', () => {
  const runtime = load(), config = structuredClone(configuration);
  config.network.configurations.public.rpcUrl = '';
  assert.throws(() => runtime.configureNetwork(config, 'public'), /not configured/);
  assert.equal(runtime.API_NETWORK, undefined);
});
