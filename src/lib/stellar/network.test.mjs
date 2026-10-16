import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('./network.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;

function configuration(env = {}) {
  const module = { exports: {} };
  runInNewContext(source, {
    module,
    exports: module.exports,
    process: { env },
  });
  return module.exports;
}

test('Stellar defaults stay on Testnet with the configured browser-compatible RPC', () => {
  const config = configuration();
  assert.equal(config.NETWORK, 'Test SDF Network ; September 2015');
  assert.equal(config.API_NETWORK, 'testnet');
  assert.equal(config.HORIZON_URL, 'https://horizon-testnet.stellar.org');
  assert.equal(config.SOROBAN_URL, 'https://soroban-testnet.stellar.org');
});

test('deployment endpoint overrides are honored without changing the signing network', () => {
  const config = configuration({
    NEXT_PUBLIC_STELLAR_HORIZON_URL: ' https://horizon.example/testnet ',
    NEXT_PUBLIC_STELLAR_RPC_URL: ' https://rpc.example/testnet ',
  });
  assert.equal(config.HORIZON_URL, 'https://horizon.example/testnet');
  assert.equal(config.SOROBAN_URL, 'https://rpc.example/testnet');
  assert.equal(config.NETWORK, configuration().NETWORK);
  assert.equal(
    configuration({ NEXT_PUBLIC_STELLAR_RPC_URL: ' ' }).SOROBAN_URL,
    configuration().SOROBAN_URL,
  );
});
