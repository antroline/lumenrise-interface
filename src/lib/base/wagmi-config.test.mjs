import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { loadNetworkRegistry } from '../networks/registry.fixture.mjs';

const module = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL('./wagmi-config.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const chains = { base: { id: 8453 }, baseSepolia: { id: 84532 } };
const mocks = {
  '@privy-io/wagmi': { createConfig: config => config },
  'viem/chains': chains,
  wagmi: { http: () => ({ type: 'http' }) },
};
runInNewContext(code, { module, exports: module.exports, require: name => {
  assert.ok(name in mocks, name);
  return mocks[name];
} });
const { resolveNetwork } = loadNetworkRegistry();

for (const id of ['base-mainnet', 'base-sepolia']) test(`wagmi config isolates the selected Base environment: ${id}`, () => {
  const network = resolveNetwork(id);
  const config = module.exports.createBaseWagmiConfig(network);
  assert.deepEqual(Array.from(config.chains, chain => chain.id), [network.chainId]);
  assert.deepEqual(Object.keys(config.transports), [String(network.chainId)]);
  assert.equal(config.transports[network.chainId].type, 'http');
  assert.equal('connectors' in config, false);
});
