import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { configuration } from '../../../lib/api/config.fixture.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const owner = '0x1111111111111111111111111111111111111111';
const factory = '0x2222222222222222222222222222222222222222';
const pair = '0x3333333333333333333333333333333333333333';
const token = '0x4444444444444444444444444444444444444444';
const curve = '0x5555555555555555555555555555555555555555';
const hash = n => `0x${String(n).repeat(64)}`;
const deposit = 100000000n * 10n ** 18n;

function harness(options = {}, storage = new Map()) {
  const modules = new Map(), calls = [], states = [], refs = [];
  let cursor = 0, refCursor = 0, controller, allowance = options.allowance ?? 0n, mined = false;
  let clock = Date.now(), identity = 'did:privy:creation:' + owner;
  const config = { ...configuration, chain: 'base', auth: { appId: 'test' }, network: { configurations: { testnet: { launchConfigured: true, factoryContractId: factory } } } };
  const account = { address: owner, accountReady: true, baseSigningSupported: true, isSignedIn: true, account: { status: 'registered', profile: { userId: 'did:privy:creation' } }, notify() {} };
  const image = { name: 'Example', slug: 'example', imageId: 'image', publicUrl: 'https://example.test/logo.png', status: 'pending' };
  const imageInfo = () => ({ ...image, ownerAddress: owner, network: 'testnet', ...(options.expired && !calls.includes('upload') ? { status: 'expired' } : {}), ...(mined && !options.pendingIndex ? { status: 'finalized', launchContractId: curve, assetContractId: token } : {}) });
  const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  const wallet = {
    get identity() { return identity; }, owner,
    async ensureChain() { calls.push('chain'); },
    async code(address) { return address === owner ? options.ownerCode : address === factory && options.missingFactory ? undefined : address === token ? (options.badCode ? '0x1234' : load('lib/base/tokenDeployment.ts').launchTokenDeployment.deployedBytecode) : '0x01'; },
    async gasBalance() { return options.noGas ? 0n : 10n ** 18n; },
    async estimate() { return 100n; },
    async read(requests) { return requests.map(call => {
      switch (call.functionName) {
        case 'settings': return { pair, graduation: curve, platform: owner, platform_fee_bps: 100 };
        case 'getChainId': return 84532n;
        case 'pair': return pair;
        case 'decimals': return call.address === pair ? 6 : 18;
        case 'symbol': return call.address === pair ? 'USDC' : 'EX';
        case 'name': return image.name;
        case 'totalSupply': return deposit;
        case 'balanceOf': return options.changedBalance ? deposit - 1n : deposit;
        case 'allowance': return allowance;
        case 'get_config': return { factory, total_supply: deposit, params: { owner, asset: token, pair } };
        default: throw new Error(call.functionName);
      }
    }); },
    async simulate(call) { calls.push('simulate:' + call.functionName); if (options.changeIdentity) identity = 'different-account'; },
    async deploy(name, symbol, supply, onHash) { calls.push('deploy'); assert.equal(name, image.name); assert.equal(symbol, 'EX'); assert.equal(supply, deposit); onHash(hash(1)); },
    async write(call, onHash) {
      calls.push(call);
      if (call.functionName === 'approve') {
        if (options.rejectApproval) throw Object.assign(new Error('Rejected'), { code: 4001 });
        if (options.unknownApproval) throw new Error('Provider disconnected before returning a hash');
        assert.equal(call.address, token); assert.equal(call.args[0], factory); assert.equal(call.args[1], deposit);
        allowance = deposit; onHash(hash(2));
      } else { assert.equal(call.address, factory); assert.equal(call.args[0].pair, pair); assert.equal(call.args[0].asset, token); onHash(hash(3)); }
    },
    async receipt(tx) {
      calls.push('receipt:' + tx);
      if (tx === hash(1)) return { status: 'success', contractAddress: token, logs: [] };
      if (tx === hash(2)) return { status: options.revertedApproval ? 'reverted' : 'success', logs: [] };
      if (options.receiptPending) throw new Error('Receipt pending');
      mined = true;
      return { status: 'success', logs: [{ address: factory, topics: encodeEventTopics({ abi: load('lib/base/factoryAbi.ts').factoryAbi, eventName: 'LaunchCreated', args: { index: 2n ** 100n, curve, owner } }), data: encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [token, deposit]) }] };
    },
  };
  const mocks = {
    react: {
      useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
      useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
      useLayoutEffect() {},
    },
    'next/navigation': { useRouter: () => ({ refresh() { calls.push('refresh'); } }) },
    '@/lib/launchpad': { useLaunchpad: () => account },
    '@/lib/configuration': { useConfiguration: () => config },
    '@/lib/networks/context': { useNetwork: () => ({ activeNetwork: { id: options.mainnet ? 'base-mainnet' : 'base-sepolia', apiNetwork: options.mainnet ? 'public' : 'testnet' } }) },
    '@/lib/api/client': { getApiBaseUrl: () => 'https://api.test', getApiChain: () => 'base', getApiNetwork: () => 'testnet', getApiUserId: () => 'did:privy:creation', ApiError: class extends Error {} },
    '@/lib/api/launches/market': { async getLaunchList() { return { launches: options.conflict ? [{ metadata: { name: 'Example', symbol: 'EX' } }] : [], total: 0, limit: 20 }; } },
    '@/lib/api/launches/images': { async uploadLaunchImage() { calls.push('upload'); return image; }, async getLaunchImage() { return imageInfo(); }, fileFromDataUrl: () => ({}), launchImageErrorMessage: e => e.message },
  };
  function load(name) {
    const path = resolve(root, name);
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} }; modules.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(source, { module, exports: module.exports, TextEncoder, Error, Date: class extends Date { static now() { return clock; } }, setTimeout(fn, ms) { clock += ms; queueMicrotask(fn); }, localStorage, sessionStorage: localStorage,
      require(name) {
        if (mocks[name]) return mocks[name];
        if (name.endsWith('use-base-creation-wallet')) return { useBaseCreationWallet: () => wallet };
        if (name.endsWith('/api/config')) return { getConfiguration: () => config };
        if (name.endsWith('launch-stages')) return { launchStages: [{}], validateLaunchStage: () => ({}) };
        return name.startsWith('.') ? load(resolve(dirname(path), name + '.ts')) : name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name);
      },
    }, { filename: path });
    return module.exports;
  }
  const draft = { ...load('features/create-launch/lib/launch-draft.ts').initialLaunchDraft, name: 'Example', symbol: 'EX', description: 'Example project', logo: 'data:image/png;base64,AA==' };
  const hook = load('features/create-launch/hooks/use-base-bonding-launch.ts').useBaseBondingLaunch;
  function render() { cursor = 0; refCursor = 0; return controller = hook(); }
  render();
  return { calls, storage, draft, load, async launch() { await controller.launch(draft); return render().operation; }, changeIdentity() { identity = 'other'; }, wallet };
}

test('Base creation deploys fixed supply, approves full asset balance, and creates exact 18/6 tuple', async () => {
  const h = harness(); assert.equal((await h.launch()).status, 'success');
  const writes = h.calls.filter(call => typeof call === 'object');
  assert.deepEqual(writes.map(call => call.functionName), ['approve', 'create_bonding_curve']);
  assert.equal(writes[1].args[0].curve.graduation_target, 5000n * 10n ** 6n);
  assert.equal(writes[1].args[0].vesting.schedule, 1);
  assert.equal([...h.storage.keys()].filter(key => key.startsWith('lumenrise:base')).length, 0);
});
for (const [option, message] of [['changedBalance', /balance/], ['badCode', /artifact/], ['missingFactory', /not deployed/], ['noGas', /ETH/], ['rejectApproval', /Rejected/], ['revertedApproval', /approval reverted/], ['conflict', /already taken/], ['mainnet', /Mainnet|mainnet/]]) {
  test(`${option} prevents the factory write`, async () => {
    const h = harness({ [option]: true }); const result = await h.launch();
    assert.equal(result.status, 'error'); assert.match(result.message, message);
    assert.equal(h.calls.some(call => call?.functionName === 'create_bonding_curve'), false);
    if (['noGas', 'conflict', 'mainnet', 'missingFactory'].includes(option)) assert.equal(h.calls.includes('upload'), false);
  });
}
test('sufficient asset allowance skips approval', async () => {
  const h = harness({ allowance: deposit }); assert.equal((await h.launch()).status, 'success');
  assert.equal(h.calls.some(call => call?.functionName === 'approve'), false);
});
test('a linked EIP-7702 EOA can deploy and launch through ordinary transactions', async () => {
  const h = harness({ ownerCode: '0xef0100' + '6'.repeat(40) });
  assert.equal((await h.launch()).status, 'success');
  assert.equal(h.calls.includes('deploy'), true);
});
test('a contract account or malformed delegation remains blocked before upload or signatures', async () => {
  for (const ownerCode of ['0x1234', '0xef0100', '0xef0100' + '6'.repeat(42), '0xef0101' + '6'.repeat(40)]) {
    const h = harness({ ownerCode });
    assert.match((await h.launch()).message, /Smart-wallet deployment/);
    assert.equal(h.calls.includes('upload'), false);
    assert.equal(h.calls.includes('deploy'), false);
  }
});
test('pending factory receipt survives reload and never repeats token deployment or factory signing', async () => {
  const h = harness({ receiptPending: true }); assert.equal((await h.launch()).status, 'error');
  const resumed = harness({}, h.storage); assert.equal((await resumed.launch()).status, 'success');
  assert.equal(resumed.calls.includes('deploy'), false);
  assert.equal(resumed.calls.some(call => typeof call === 'object'), false);
});
test('pending indexing retries the saved receipt without repeating signatures', async () => {
  const h = harness({ pendingIndex: true }); assert.match((await h.launch()).message, /indexing is still pending/);
  const resumed = harness({}, h.storage); assert.equal((await resumed.launch()).status, 'success');
  assert.equal(resumed.calls.includes('deploy'), false);
  assert.equal(resumed.calls.some(call => typeof call === 'object'), false);
});
test('rejected approval retry reuses the token deployment', async () => {
  const h = harness({ rejectApproval: true }); await h.launch();
  const resumed = harness({}, h.storage); assert.equal((await resumed.launch()).status, 'success');
  assert.equal(resumed.calls.includes('deploy'), false);
});
test('a changed reviewed draft cannot overwrite a submitted recovery', async () => {
  const h = harness({ receiptPending: true }); await h.launch(); h.draft.symbol = 'NEW';
  assert.match((await h.launch()).message, /earlier launch/);
  assert.equal(h.calls.filter(call => call === 'deploy').length, 1);
});
test('an expired reservation is renewed while the existing token is reused', async () => {
  const h = harness({ rejectApproval: true }); await h.launch();
  const resumed = harness({ expired: true }, h.storage); assert.equal((await resumed.launch()).status, 'success');
  assert.equal(resumed.calls.includes('upload'), true); assert.equal(resumed.calls.includes('deploy'), false);
});
test('an ambiguous wallet response blocks further signing after reload', async () => {
  const h = harness({ unknownApproval: true }); await h.launch();
  const resumed = harness({}, h.storage); assert.match((await resumed.launch()).message, /no confirmed hash/);
  assert.equal(resumed.calls.length, 0);
});
test('an account change during approval simulation prevents the approval and factory signature', async () => {
  const h = harness({ changeIdentity: true }); assert.match((await h.launch()).message, /context changed/);
  assert.equal(h.calls.some(call => typeof call === 'object'), false);
});
test('the bundled literal deploys creation bytecode.object with the supplied constructor ABI', () => {
  const h = harness();
  const artifact = JSON.parse(readFileSync(resolve(root, 'lib/base/abi/LaunchToken.json'), 'utf8'));
  const literal = h.load('lib/base/tokenDeployment.ts').launchTokenDeployment;
  assert.equal(artifact.metadata.compiler.version, '0.8.30+commit.73712a01');
  assert.equal(artifact.metadata.settings.evmVersion, 'cancun'); assert.equal(artifact.metadata.settings.viaIR, true);
  assert.equal(literal.bytecode, artifact.bytecode.object); assert.equal(literal.deployedBytecode, artifact.deployedBytecode.object);
  assert.notEqual(literal.bytecode, artifact.deployedBytecode.object);
  assert.deepEqual(JSON.parse(JSON.stringify(literal.abi)), artifact.abi);
  assert.deepEqual(artifact.abi.find(entry => entry.type === 'constructor').inputs.map(input => input.type), ['string', 'string', 'uint256', 'address']);
});
