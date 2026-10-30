import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url), root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const F = '0x' + '1'.repeat(40), C = '0x' + '2'.repeat(40), A = '0x' + '3'.repeat(40), P = '0x' + '4'.repeat(40), O = '0x' + '5'.repeat(40);
function loader(mocks = {}) {
  const cache = new Map();
  return function load(name) {
    const path = resolve(root, name); if (cache.has(path)) return cache.get(path);
    const module = { exports: {} }; cache.set(path, module.exports);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { module, exports: module.exports, Error, TextEncoder,
      require: name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(resolve(dirname(path), name + '.ts')) : require(name),
    }, { filename: path }); return module.exports;
  };
}
const load = loader(), { encodeFunctionData, decodeFunctionData, encodeEventTopics, encodeAbiParameters } = require('viem');
const { factoryAbi } = load('lib/base/factoryAbi.ts'), { launchAbi } = load('lib/base/launchAbi.ts');
test('generated factory and launch types preserve every supplied ABI field exactly', () => {
  for (const [name, abi] of [['LaunchpadFactory', factoryAbi], ['BondingCurve', launchAbi]])
    assert.equal(JSON.stringify(abi), JSON.stringify(JSON.parse(readFileSync(resolve(root, 'lib/base/abi/' + name + '.json')))));
  const event = factoryAbi.find(item => item.name === 'LaunchCreated');
  assert.equal(event.inputs[0].type, 'uint256'); assert.equal(event.inputs[0].indexed, true); assert.equal(event.inputs[1].name, 'curve');
});
const params = { owner: O, asset: A, pair: P, metadata: { name: 'Token', symbol: 'TOK', description: 'Full text', logo: 'https://image.test/logo.png' },
  allocations: { pool_bps: 2000, curve_bps: 8000, team_bps: 0 }, vesting: { cliff_seconds: 0n, duration_seconds: 0n, schedule: 0 },
  curve: { virtual_base_reserve: 1000n, virtual_quote_reserve: 1000n, graduation_target: 100n, creator_fee_bps: 50, creator_payout_bps: 0 }, starts_at: 0n };
const review = { caller: O, pair: P, symbol: 'TOK', reviewedDeposit: 1000n, currentBalance: 1000n, platformFeeBps: 100 };
test('creation tuple matches the supplied ABI and includes no reputation or correlation arguments', () => {
  const { encodeBaseCreation } = load('lib/base/creation.ts');
  const data = encodeBaseCreation(params, review);
  assert.equal(data, encodeFunctionData({ abi: factoryAbi, functionName: 'create_bonding_curve', args: [params] }));
  const decoded = decodeFunctionData({ abi: factoryAbi, data });
  assert.equal(decoded.args.length, 1); assert.equal('reputation_label' in decoded.args[0], false);
});
test('creation requires the entire reviewed balance, actual caller, pair and UTF-8 limits', () => {
  const { encodeBaseCreation, baseMetadataError } = load('lib/base/creation.ts');
  assert.throws(() => encodeBaseCreation(params, { ...review, currentBalance: 1001n }), /entire current owner balance/);
  assert.throws(() => encodeBaseCreation(params, { ...review, caller: C }), /owner/);
  assert.throws(() => encodeBaseCreation(params, { ...review, pair: C }), /pair/);
  assert.equal(baseMetadataError('é'.repeat(256), 'description'), undefined);
  assert.match(baseMetadataError('é'.repeat(257), 'description'), /512 UTF-8 bytes/);
  assert.throws(() => encodeBaseCreation({ ...params, metadata: { ...params.metadata, description: 'é'.repeat(257) } }, review), /512/);
});
test('Bought and Sold preserve gross/net amounts, fees, caller and launch identity', () => {
  const { decodeBaseTradeEvents } = load('lib/base/events.ts');
  const event = (name, args, amounts) => ({ address: C, topics: encodeEventTopics({ abi: launchAbi, eventName: name, args }), data: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], amounts) });
  const buy = event('Bought', { buyer: O }, [20100000n, 10n ** 18n, 100000n]);
  const sell = event('Sold', { seller: O }, [10n ** 18n, 19900000n, 100000n]);
  const decoded = decodeBaseTradeEvents([buy, sell, { ...buy, address: F }], C, O, 18);
  assert.equal(decoded.length, 2); assert.equal(decoded[0].gross, 20000000n); assert.equal(decoded[0].userAmount, 20100000n);
  assert.equal(decoded[1].gross, 20000000n); assert.equal(decoded[1].userAmount, 19900000n); assert.equal(decoded[1].executionPrice, 20000000n);
  assert.equal(decodeBaseTradeEvents([buy], C, F, 18).length, 0);
});
function deployment(patch = {}) {
  const launch = { network: 'testnet', factoryIndex: '9007199254740993', contractId: C, factoryContractId: F, asset: A, pair: P, owner: O, assetDecimals: 18, pairDecimals: 6, ...patch.launch };
  const values = { get_config: { factory: F, platform: F, platform_fee_bps: 100, params: { owner: O, asset: A, pair: P } }, get_state: { busy: false, graduated: false }, status: 1, current_price: 1000769n,
    settings: { platform: F, platform_fee_bps: 100, pair: P }, launch_at: C, getChainId: 84532n, ...patch.values };
  const calls = [];
  const hooks = {
    useReadContract(options) { calls.push(options); const data = options.functionName === 'decimals' ? options.address === A ? 18 : 6 : values[options.functionName];
      return { data, isError: false, refetch: async () => ({ data, isError: false }) }; },
    useBytecode(options) { return { data: options.address === patch.emptyCode ? undefined : '0x1234', isError: false, refetch: async () => ({ data: options.address === patch.emptyCode ? undefined : '0x1234', isError: false }) }; },
  };
  const load = loader({ wagmi: hooks, '@/lib/api/config': { getConfiguration: () => ({ chain: 'base', network: { configurations: { [launch.network]: { factoryContractId: F, launchConfigured: true } } } }) } });
  return { runtime: load('features/base/use-base-launch-reads.ts').useBaseLaunchReads(launch, 'base:testnet:test-wallet'), calls };
}
test('live deployment verification uses explicitly scoped hooks and uint256 launch membership', async () => {
  const h = deployment(); assert.equal(h.runtime.unavailable, undefined); await h.runtime.revalidate();
  assert.equal(h.calls.find(call => call.functionName === 'launch_at').args[0], 9007199254740993n);
  for (const call of h.calls) { assert.equal(call.chainId, 84532); assert.equal(call.scopeKey, 'base:testnet:test-wallet'); assert.equal(call.query.enabled, true); }
});
for (const [name, patch] of [
  ['mainnet copied settings', { launch: { network: 'public' } }], ['actual RPC mismatch', { values: { getChainId: 8453n } }],
  ['missing bytecode', { emptyCode: C }], ['wrong launch member', { values: { launch_at: F } }],
  ['decimal mismatch', { launch: { pairDecimals: 18 } }], ['missing decimals', { launch: { assetDecimals: undefined } }],
  ['busy', { values: { get_state: { busy: true, graduated: false } } }], ['scheduled', { values: { status: 0 } }],
  ['graduated', { values: { status: 2 } }], ['wrong factory pair', { values: { settings: { platform: F, platform_fee_bps: 100, pair: A } } }],
]) test(`${name} blocks the runtime capability`, async () => { const h = deployment(patch); assert.ok(h.runtime.unavailable); await assert.rejects(h.runtime.revalidate()); });
