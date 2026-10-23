import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { configuration } from '../lib/api/config.fixture.mjs';

const code = ts.transpileModule(readFileSync(new URL('./client-app.tsx', import.meta.url), 'utf8') + '\nexport { BluxNetworkSync };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(selected, { isReady = false } = {}) {
  const switches = [];
  const blux = { isReady };
  const networks = { mainnet: configuration.network.configurations.public.networkPassphrase, testnet: configuration.network.configurations.testnet.networkPassphrase };
  let previousDeps, effect;
  const switchNetwork = network => {
    assert.equal(blux.isReady, true, 'switching before createConfig is ready');
    switches.push(network);
  };
  const mocks = {
    react: { useEffect(callback, deps) {
      if (!previousDeps || deps.some((value, index) => value !== previousDeps[index])) effect = callback;
      previousDeps = deps;
    } },
    '@bluxcc/react': { useBlux: () => blux, useSwitchNetwork: () => ({ networks, switchNetwork }) },
    '@/lib/stellar/network': { API_NETWORK: selected },
  };
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] ?? {} });
  return {
    switches, blux,
    render() {
      effect = undefined;
      assert.equal(module.exports.BluxNetworkSync(), null);
      effect?.();
    },
  };
}

for (const selected of ['public', 'testnet']) {
  test(`initial ${selected} selection switches Blux once it becomes ready`, () => {
    const h = harness(selected);
    h.render(); h.render();
    assert.deepEqual(h.switches, []);
    h.blux.isReady = true;
    h.render(); h.render();
    assert.deepEqual(h.switches, [configuration.network.configurations[selected].networkPassphrase]);
  });

  test(`an already-ready Blux instance switches on initial ${selected} load`, () => {
    const h = harness(selected, { isReady: true });
    h.render();
    assert.deepEqual(h.switches, [configuration.network.configurations[selected].networkPassphrase]);
  });
}
