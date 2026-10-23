import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { Networks } from '@stellar/stellar-sdk';

const code = ts.transpileModule(readFileSync(new URL('./clients.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function load(network, horizonPassphrase, rpcPassphrase, failure) {
  const expected = network === 'public' ? Networks.PUBLIC : Networks.TESTNET;
  const runtime = { API_NETWORK: network, NETWORK: expected, HORIZON_URL: 'https://horizon.example', SOROBAN_URL: 'https://rpc.example' };
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, Error,
    require: name => name === './network' ? runtime : {
      Networks,
      Horizon: { Server: class { async root() { if (failure) throw failure; return { network_passphrase: horizonPassphrase }; } } },
      rpc: { Server: class { async getNetwork() { return { passphrase: rpcPassphrase }; } } },
    },
  });
  return { clients: module.exports, runtime };
}
for (const network of ['public', 'testnet']) {
  const expected = network === 'public' ? Networks.PUBLIC : Networks.TESTNET;
  const other = network === 'public' ? Networks.TESTNET : Networks.PUBLIC;
  test(`publishes clients only after both endpoints verify ${network}`, async () => {
    const { clients } = load(network, expected, expected);
    const pending = clients.initializeStellarClients();
    assert.equal(clients.horizon, undefined);
    await pending;
    assert.ok(clients.horizon);
    assert.ok(clients.soroban);
  });
  for (const [horizon, rpc] of [[other, expected], [expected, other], [other, other], [undefined, undefined]]) {
    test(`rejects mismatched or missing endpoint identity on ${network}: ${horizon}, ${rpc}`, async () => {
      const { clients } = load(network, horizon, rpc);
      await assert.rejects(clients.initializeStellarClients(), /different Stellar network/);
      assert.equal(clients.horizon, undefined);
      assert.equal(clients.soroban, undefined);
    });
  }
}
test('configuration passphrase must match the selected network', async () => {
  const { clients, runtime } = load('public', Networks.TESTNET, Networks.TESTNET);
  runtime.NETWORK = Networks.TESTNET;
  await assert.rejects(clients.initializeStellarClients(), /passphrase is incorrect/);
});
test('unreachable providers fail initialization', async () => {
  const { clients } = load('public', Networks.PUBLIC, Networks.PUBLIC, new Error('RPC unavailable'));
  await assert.rejects(clients.initializeStellarClients(), /unavailable/);
  assert.equal(clients.horizon, undefined);
});
