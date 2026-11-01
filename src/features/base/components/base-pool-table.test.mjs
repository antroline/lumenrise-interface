import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
const ui = (...names) => Object.fromEntries(names.map(name => [name, name]));
const A = '0x' + '1'.repeat(40), B = '0x' + '2'.repeat(40), ID = '0x' + 'a'.repeat(64);
function harness(options = {}) {
  const launch = { network: 'testnet', contractId: A, asset: B, pair: A, assetDecimals: 18, pairDecimals: 6, metadata: { symbol: 'ANG' }, ...options.launch };
  const data = { key: { currency0: A, currency1: B, tickSpacing: 60 }, slot0: [5505400448681967349566181336224857653n, 361151, 0, 3000], liquidity: 340490822233631430n,
    blockNumber: 52988179n, graduation: { pool_id: ID, token_id: 33196n, asset_deposited: 100n * 10n ** 18n, pair_deposited: 4900n * 10n ** 6n } };
  const events = [];
  const settlement = { data: { settled: true }, isPending: false, refetch: async () => { events.push('settlement'); return { data: settlement.data }; }, ...options.settlement };
  const pool = { data, deployment: { manager: A, positions: B }, refetch: async () => events.push('pool'), ...options.pool };
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(new URL('./base-pool-table.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx }, wagmi: { useReadContract: o => { events.push(o.chainId); return settlement; } },
    'lucide-react': ui('Droplets'), '@/components/ui/button': ui('Button'),
    '@/components/ui/empty': ui('Empty', 'EmptyDescription', 'EmptyHeader', 'EmptyMedia', 'EmptyTitle'),
    '@/components/ui/skeleton': ui('Skeleton'), '@/components/ui/table': ui('Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow'),
    '@/features/launches/components/launch-project-links': ui('CopyAddress'),
    '@/lib/chain-address': { explorerUrl: (address, network) => `https://${network === 'testnet' ? 'sepolia.' : ''}basescan.org/address/${address}` },
    '@/lib/api/launches/display': { pairLabel: () => 'USDC' },
    '@/lib/base/amount': { formatBaseAmount: (amount, decimals) => require('viem').formatUnits(amount, decimals) },
    '@/lib/base/wallet': { sameEvmAddress: (a, b) => a.toLowerCase() === b.toLowerCase() },
    '@/lib/base/uniswap-v4': { graduationAbi: [], formatV4Price: (numerator, denominator, ad, pd) => {
      const result = numerator * 10n ** BigInt(ad + 12) / (denominator * 10n ** BigInt(pd));
      return require('viem').formatUnits(result, 12);
    } },
    '../use-base-v4-pool': { useBaseV4Pool: (l, enabled) => { events.push(enabled); return pool; } },
  };
  runInNewContext(output, { module, exports: module.exports, require: name => name in mocks ? mocks[name] : require(name) });
  return { tree: module.exports.BasePoolTable({ launch }), events };
}
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
}
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node ? '' : [node.props?.children].flat(Infinity).map(text).join(' ');
for (const network of ['testnet', 'public']) test(`pool table shows verified pool metadata and correct ${network} explorer links`, () => {
  const h = harness({ launch: { network } }), nodes = elements(h.tree), content = text(h.tree);
  assert.ok(content.includes('Uniswap V4')); assert.ok(content.includes('33196')); assert.ok(content.includes('0.000207100591'));
  assert.ok(content.includes('340490822233631430')); assert.ok(content.includes('0.3%'));
  assert.ok(content.includes('Currency 0 · USDC')); assert.ok(content.includes('Currency 1 · ANG'));
  assert.ok(content.includes('100 ANG')); assert.ok(content.includes('4900 USDC'));
  assert.ok(content.includes('not current pool balances'));
  assert.ok(nodes.some(n => n.type === 'CopyAddress' && n.props.address === ID));
  for (const link of nodes.filter(n => n.type === 'a')) assert.ok(link.props.href.startsWith(network === 'testnet' ? 'https://sepolia.basescan.org/' : 'https://basescan.org/'));
  assert.ok(h.events.includes(network === 'testnet' ? 84532 : 8453));
});
test('unsettled launches show no invented pool data and disable pool discovery', () => {
  const h = harness({ settlement: { data: { settled: false } }, pool: { data: undefined } });
  assert.ok(text(h.tree).includes('Pool not created yet')); assert.ok(h.events.includes(false));
  assert.equal(elements(h.tree).some(n => n.type === 'Table'), false);
});
test('pool loading is announced accessibly', () => {
  const h = harness({ settlement: { isPending: true, data: undefined }, pool: { data: undefined } });
  assert.equal(h.tree.props.role, 'status'); assert.equal(h.tree.props['aria-busy'], 'true');
  assert.equal(elements(h.tree).filter(n => n.type === 'Skeleton').length, 4);
});
test('failed reads offer a real retry of settlement and pool data', async () => {
  const h = harness({ pool: { data: undefined, isError: true, error: new Error('RPC unavailable') } });
  assert.ok(text(h.tree).includes('RPC unavailable'));
  elements(h.tree).find(n => n.type === 'Button').props.onClick();
  await new Promise(setImmediate);
  assert.ok(h.events.includes('settlement')); assert.ok(h.events.includes('pool'));
});
test('failed background refresh keeps existing values with an explicit stale notice', () => {
  const h = harness({ pool: { isError: true, error: new Error('RPC unavailable') } });
  assert.ok(text(h.tree).includes('last verified pool snapshot'));
  assert.ok(elements(h.tree).some(n => n.type === 'Table'));
});
test('missing decimals do not produce misleading amounts', () => {
  const h = harness({ launch: { pairDecimals: undefined } });
  assert.ok(text(h.tree).includes('decimals could not be verified'));
  assert.equal(elements(h.tree).some(n => n.type === 'Table'), false);
});
