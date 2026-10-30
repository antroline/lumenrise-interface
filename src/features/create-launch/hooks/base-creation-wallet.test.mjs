import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const owner = '0x1111111111111111111111111111111111111111';
const tx = '0x' + 'a'.repeat(64);
function harness(options = {}) {
  const states = [], refs = [], scopes = [], mutations = [], effects = [];
  let cursor = 0, refCursor = 0, chainId = 1, adapter, scheduled = false;
  const connector = { async getChainId() { return chainId; } };
  const account = { address: owner, account: { status: 'registered', profile: { userId: 'did:privy:alice' } }, baseSigningSupported: true };
  const connection = { address: owner, connector };
  const query = (options, data) => { if (options.query.enabled) scopes.push(options.scopeKey); return { isSuccess: options.query.enabled, isError: false, data }; };
  const mockWagmi = {
    useConnection: () => connection,
    useReadContracts: options => query(options, options.contracts.map(call => call.functionName)),
    useBytecode: parameters => query(parameters, 'bytecode' in options ? options.bytecode : '0x1234'),
    useBalance: options => query(options, { value: 1000n }),
    useEstimateGas: options => query(options, 100n),
    useEstimateFeesPerGas: options => query(options, { maxFeePerGas: 2n }),
    useSimulateContract: options => query(options, { result: true }),
    useWaitForTransactionReceipt: options => query(options, { status: 'success', logs: [] }),
    useWriteContract: () => ({ async mutateAsync(options) { mutations.push(options); return tx; } }),
    useDeployContract: () => ({ async mutateAsync(options) { mutations.push(options); return tx; } }),
    useSwitchChain: () => ({ async mutateAsync(options) { chainId = options.chainId; mutations.push(options); } }),
  };
  function schedule() { if (!scheduled) { scheduled = true; queueMicrotask(() => { scheduled = false; render(); }); } }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; schedule(); }]; },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useLayoutEffect(effect) { effects.push(effect); },
    useEffect(effect, dependencies) { if (!dependencies || !adapter) effects.push(effect); },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('./use-base-creation-wallet.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { module, exports: module.exports, Error, require(name) {
    if (name === 'react') return react;
    if (name === 'wagmi') return mockWagmi;
    if (name === '@/lib/launchpad') return { useLaunchpad: () => account };
    if (name === '@/lib/base/wallet') return { sameEvmAddress: (a, b) => a.toLowerCase() === b.toLowerCase() };
    if (name === '@/lib/base/tokenDeployment') return { launchTokenDeployment: { abi: [], bytecode: '0xab', deployedBytecode: '0xcd' } };
    return require(name);
  } });
  function render() { cursor = 0; refCursor = 0; effects.length = 0; adapter = module.exports.useBaseCreationWallet(); for (const effect of [...effects]) effect(); }
  render();
  return { get adapter() { return adapter; }, account, connection, mutations, scopes, render };
}
test('the wagmi command bridge resolves sequential reads, bytecode, balance, gas, simulation and receipts', async () => {
  const h = harness();
  assert.equal((await h.adapter.read([{ address: owner, abi: [], functionName: 'name' }]))[0], 'name');
  assert.equal(await h.adapter.code(owner), '0x1234');
  assert.equal(await h.adapter.gasBalance(), 1000n);
  assert.equal(await h.adapter.estimate('0xab'), 240n);
  assert.equal(await h.adapter.simulate({ address: owner, abi: [], functionName: 'approve' }), true);
  assert.equal((await h.adapter.receipt(tx)).status, 'success');
  assert.ok(new Set(h.scopes).size >= 5);
  assert.equal(h.mutations.length, 0);
});
test('the wagmi bridge switches chain before deployment and preserves the actual hash callback', async () => {
  const h = harness(); await h.adapter.ensureChain();
  const hashes = []; await h.adapter.deploy('Example', 'EX', 123n, value => hashes.push(value));
  assert.equal(h.mutations.length, 2); assert.equal(h.mutations[1].chainId, 84532);
  assert.equal(h.mutations[1].bytecode, '0xab');
  assert.deepEqual(Array.from(h.mutations[1].args), ['Example', 'EX', 123n, owner]);
  assert.equal(h.mutations[1].account, owner); assert.equal(h.mutations[1].args[3], owner);
  assert.deepEqual(hashes, [tx]);
});
test('the bridge refuses signing on another chain or after the linked wallet changes', async () => {
  const h = harness();
  await assert.rejects(h.adapter.deploy('Example', 'EX', 123n, () => {}), /Base Sepolia/);
  await h.adapter.ensureChain(); h.connection.address = '0x2222222222222222222222222222222222222222'; h.render();
  await assert.rejects(h.adapter.write({ address: owner, abi: [], functionName: 'approve' }, () => {}), /wallet or account changed/);
  assert.equal(h.mutations.length, 1);
});
test('wagmi null and other empty-code results represent an EOA rather than invalid bytecode', async () => {
  for (const bytecode of [null, undefined, '0x']) {
    const h = harness({ bytecode });
    assert.equal(await h.adapter.code(owner), undefined);
    assert.equal(h.mutations.length, 0);
  }
});
test('malformed bytecode results still stop execution', async () => {
  for (const bytecode of [123, {}, 'not-hex']) {
    const h = harness({ bytecode });
    await assert.rejects(h.adapter.code(owner), /Invalid deployed bytecode/);
    assert.equal(h.mutations.length, 0);
  }
});
