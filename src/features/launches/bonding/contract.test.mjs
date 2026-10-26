import { networkModule } from '../../../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// Use the same SDK instance as the transpiled source (CJS) so instanceof
// checks in changeTrust see the real asset class, rather than its ESM twin.
const { Account, Asset, Keypair, Networks, TransactionBuilder } = require('@stellar/stellar-sdk');
function loadSource(filename, mocks = {}, cache = new Map(), globals = {}) {
  const path = resolve(directory, filename);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, Error, setTimeout: resolve => resolve(), ...globals,
    require: name => name === '@/lib/stellar/network' ? networkModule : name in mocks ? mocks[name] : name.startsWith('.')
      ? loadSource(resolve(dirname(path), `${name}${name === './transaction-hash' ? '.tsx' : '.ts'}`), mocks, cache, globals) : require(name),
  }, { filename: path });
  return module.exports;
}
const domain = loadSource('contract.ts');
const owner = Keypair.random().publicKey();
const issuer = Keypair.random().publicKey();
const asset = new Asset('LAUNCH', issuer);
const usdc = new Asset('USDC', Keypair.random().publicKey());
const tokens = { asset, pair: Asset.native() };
function wallet(balances = []) {
  return Object.assign(new Account(owner, '42'), { account_id: owner, balances });
}
function line(asset, balance = '0.0000000', limit = '922337203685.4775807', authorized = true) {
  return { asset_type: 'credit_alphanum12', asset_code: asset.getCode(), asset_issuer: asset.getIssuer(), balance, limit, is_authorized: authorized, buying_liabilities: '0.0000000' };
}

test('amounts preserve stroops above Number safe precision and reject invalid entries', () => {
  assert.equal(domain.parseAmount('900719925.4740993'), 9007199254740993n);
  assert.equal(domain.formatAmount(9007199254740993n), '900719925.4740993');
  assert.equal(domain.parseAmount('922337203685.4775807'), 9223372036854775807n);
  assert.equal(domain.parseAmount('0', true), 0n);
  for (const entry of ['0', '-1', '1e4', 'NaN', '1.00000001', '922337203685.4775808'])
    assert.throws(() => domain.parseAmount(entry));
  assert.throws(() => domain.integer(9007199254740992));
});

test('slippage rounds minimum receipts down by exact stroops', () => {
  assert.equal(domain.defaultLimit(1000000000n), 995000000n);
  assert.equal(domain.defaultLimit(1n), 0n);
  assert.equal(domain.defaultLimit(1000000000n, 125n), 987500000n);
  assert.equal(domain.defaultLimit(1000000000n, 0n), 1000000000n);
});

test('SAC identity is resolved from the actual issuer and verified on the configured network', () => {
  assert.equal(domain.assetFromSac(`LAUNCH:${issuer}`, asset.contractId(Networks.TESTNET), Networks.TESTNET).getIssuer(), issuer);
  assert.ok(domain.assetFromSac('native', Asset.native().contractId(Networks.TESTNET), Networks.TESTNET).isNative());
  assert.throws(() => domain.assetFromSac(`LAUNCH:${issuer}`, usdc.contractId(Networks.TESTNET), Networks.TESTNET));
  assert.throws(() => domain.assetFromSac('USDC', usdc.contractId(Networks.TESTNET), Networks.TESTNET));
});

test('ledger statuses decode without inventing unknown states; structs retain fee accounting', () => {
  assert.equal(domain.decodeStatus(['Failed']), 'Failed');
  assert.equal(domain.decodeStatus({ tag: 'Graduated' }), 'Graduated');
  assert.throws(() => domain.decodeStatus(['Ended']));
  const state = domain.decodeState({ sold: '12', quote_reserve: 50n, creator_fees: 2n, team_claimed: 0n, buyer_count: 3, graduated: false, busy: false });
  assert.equal(state.quote_reserve, 50n);
  assert.equal(state.creator_fees, 2n);
  assert.equal(state.buyer_count, 3n);
  assert.throws(() => domain.decodeState({ ...state, graduated: 'false' }));
});

test('buy adds only the missing launch-token trustline and waits for confirmation before reloading', async () => {
  const calls = [];
  let loads = 0;
  const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
    NETWORK: Networks.TESTNET,
    horizon: { loadAccount: async () => { calls.push('load'); return ++loads === 1 ? wallet() : wallet([line(asset)]); } },
    soroban: { getTransaction: async () => { calls.push('confirm'); return { status: 'SUCCESS' }; } },
  } });
  const result = await tx.ensureTradeTrustlines(owner, tokens, true, async xdr => {
    const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    assert.equal(transaction.operations.length, 1);
    assert.equal(transaction.operations[0].type, 'changeTrust');
    assert.equal(transaction.operations[0].line.getIssuer(), issuer);
    calls.push('send');
    return { hash: 'trust-hash' };
  }, hash => { assert.equal(hash, 'trust-hash'); calls.push('hash'); }, () => {});
  assert.deepEqual(calls, ['load', 'send', 'hash', 'confirm', 'load']);
  assert.ok(domain.trusts(result, asset));
});

test('existing trustlines and native XLM never trigger wallet setup approval', async () => {
  const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
    NETWORK: Networks.TESTNET,
    horizon: { loadAccount: async () => wallet([line(asset)]) },
    soroban: { getTransaction: async () => { throw new Error('Unexpected confirmation'); } },
  } });
  await tx.ensureTradeTrustlines(owner, tokens, false, async () => { throw new Error('Unexpected wallet signature'); }, () => {}, () => {});
});

test('trustline setup waits through NOT_FOUND before reloading the wallet for the buy', async () => {
  let lookups = 0, loads = 0, submissions = 0;
  const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
    NETWORK: Networks.PUBLIC,
    horizon: { loadAccount: async () => { loads++; return loads === 1 ? wallet() : wallet([line(asset)]); } },
    soroban: { getTransaction: async () => {
      assert.equal(loads, 1, 'The next step must wait for trustline confirmation');
      return { status: ++lookups < 4 ? 'NOT_FOUND' : 'SUCCESS' };
    } },
  } });
  await tx.ensureTradeTrustlines(owner, tokens, true, async () => {
    submissions++;
    return { hash: 'trust-hash' };
  }, () => {}, () => {});
  assert.equal(submissions, 1);
  assert.equal(lookups, 4);
  assert.equal(loads, 2);
});

test('sell adds the actual pair-token trustline when needed', async () => {
  const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
    NETWORK: Networks.TESTNET,
    horizon: { loadAccount: async () => wallet([line(asset)]) },
    soroban: { getTransaction: async () => ({ status: 'SUCCESS' }) },
  } });
  await tx.ensureTradeTrustlines(owner, { asset, pair: usdc }, false, async xdr => {
    const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    assert.equal(transaction.operations.length, 1);
    assert.equal(transaction.operations[0].line.getCode(), 'USDC');
    assert.equal(transaction.operations[0].line.getIssuer(), usdc.getIssuer());
    return { hash: 'pair-hash' };
  }, () => {}, () => {});
});

test('pending or failed trustline transactions prevent continuing to the trade', async () => {
  for (const status of ['NOT_FOUND', 'FAILED']) {
    let loads = 0;
    const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
      NETWORK: Networks.TESTNET,
      horizon: { loadAccount: async () => { loads++; return wallet(); } },
      soroban: { getTransaction: async () => ({ status }) },
    } });
    await assert.rejects(tx.ensureTradeTrustlines(owner, tokens, true, async () => ({ hash: 'pending-hash' }), () => {}, () => {}));
    assert.equal(loads, 1);
  }
});

test('frozen trustlines and full receiving limits are rejected', async () => {
  const tx = loadSource('trade.ts', { '@/lib/stellar/clients': {
    NETWORK: Networks.TESTNET,
    horizon: { loadAccount: async () => wallet([line(asset, '0', '100', false)]) },
    soroban: {},
  } });
  await assert.rejects(tx.ensureTradeTrustlines(owner, tokens, true, async () => {}, () => {}, () => {}), /not authorized/);
  const full = wallet([line(asset, '99', '100')]);
  assert.throws(() => tx.checkReceivingCapacity(full, tokens, true, 20000000n), /limit is too low/);
  const withOffer = wallet([{ ...line(asset, '99', '100'), buying_liabilities: '1.0000000' }]);
  assert.throws(() => tx.checkReceivingCapacity(withOffer, tokens, true, 1n), /limit is too low/);
});

function renderTrade(side, position = '20000000', confirmation = 'SUCCESS', missingPairTrustline = false) {
  const calls = [];
  const stored = new Map();
  const states = ['2', '2', '', false, '', '', undefined, undefined, '', null];
  let index = 0;
  let loads = 0;
  let written;
  const currentWallet = () => wallet([
    ...(!missingPairTrustline || loads > 1 ? [line(usdc, '10')] : []),
    ...(loads > 1 || !buying ? [line(asset, '2')] : []),
  ]);
  const buying = side === 'buy';
  const curve = asset.contractId(Networks.TESTNET);
  const quote = buying
    ? { gross: '20000000', creator_fee: '0', user_amount: '20000000' }
    : { gross: '30000000', creator_fee: '300000', user_amount: '29700000' };
  const primitives = Object.fromEntries(['Button', 'Input', 'Field', 'FieldDescription', 'FieldGroup', 'FieldLabel'].map(name => [name, () => null]));
  const mocks = {
    react: {
      useState: () => { const at = index++; return [states[at], value => { states[at] = value; }]; },
      useRef: () => ({ current: false }), useEffect: () => {},
    },
    '@bluxcc/react': {
      useBlux: () => ({ user: { address: owner }, isReady: true,
        sendTransaction: async () => { calls.push('trustline submitted'); return { hash: 'trustline-hash' }; } }),
      useReadContracts: () => ({ data: { values: [quote] } }),
      useWriteContract: () => ({ mutateAsync: async request => { written = request; calls.push('trade submitted'); return { hash: 'trade-hash', returnValue: async () => null }; } }),
      readContracts: async requests => {
        if (buying && requests[0].fn === 'quote_buy') {
          assert.equal(requests.length, 1);
          assert.equal(requests[0].args[0], '19999600007');
          return { values: [quote] };
        }
        assert.equal(requests[0].fn, buying ? 'get_state' : 'quote_sell');
        assert.deepEqual(Array.from(requests[0].args), buying ? [] : ['20000000']);
        // Model SAC behavior: balance() fails before the receiving trustline exists.
        for (const request of requests) {
          if (request.fn !== 'balance') continue;
          const token = request.address === asset.contractId(Networks.TESTNET) ? asset : usdc;
          const account = currentWallet();
          if (!domain.trusts(account, token))
            throw new Error('HostError: Error(Contract, #13): trustline entry is missing for account');
        }
        assert.equal(requests.length, buying ? 2 : 3);
        assert.equal(requests[1].address, (buying ? usdc : asset).contractId(Networks.TESTNET));
        return { values: buying ? [{ sold: 0n, quote_reserve: 0n, creator_fees: 0n, team_claimed: 0n, buyer_count: 0n, graduated: false, busy: false }, '100000000'] : [quote, '20000000', position] };
      },
    },
    '@/lib/stellar/clients': {
      API_NETWORK: 'testnet',
      NETWORK: Networks.TESTNET,
      horizon: { loadAccount: async () => { loads++; return currentWallet(); } },
      soroban: {
        getTransaction: async hash => { calls.push(`${hash} confirmed`); return { status: confirmation }; },
      },
    },
    '@/components/ui/button': primitives, '@/components/ui/field': primitives, '@/components/ui/input': primitives,
    '@/components/ui/skeleton': { Skeleton: 'Skeleton' },
    '@/components/form-controls': { FieldSurface: 'FieldSurface', FormInput: 'Input' },
    '@/components/ui/input-group': { InputGroup: () => null, InputGroupAddon: () => null, InputGroupInput: () => null },
    '@/features/launches/trading/trade-quote-details': { TradeQuoteDetails: 'TradeQuoteDetails' },
    '@/features/launches/trading/trade-tooltip': { TradeTooltipText: 'TradeTooltipText' },
    '@/features/launches/trading/trade-disclosure': { TradeDisclosure: () => null },
    '@/features/launches/trading/trade-value': { TradeValue: 'TradeValue' },
    '@/features/launches/trading/trade-feedback': { TradeFeedback: 'TradeFeedback' },
    '@/features/launches/trading/trade-token-pill': { TradeTokenPill: 'TradeTokenPill' },
    '@/lib/launchpad': { useLaunchpad: () => ({ loginPending: false, login: async () => {} }) },
    './trade-result-dialog': { TradeResultDialog: 'TradeResultDialog' },
    '@/components/token-logo': { TokenLogo: () => null },
    '@/lib/api/launches/trade-queue': { enqueueTrade: () => true },
    '@/features/launches/hooks/queries': { usePageVisible: () => true },
  };
  const { TradeForm } = loadSource('trade-form.tsx', mocks, new Map(), {
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
  });
  const form = TradeForm({ address: curve, side, tokens: { asset, pair: usdc, assetSymbol: 'LAUNCH', pairSymbol: 'USDC' },
    snapshot: { config: { buckets: { curve: 500000000000000n }, params: { curve: { virtual_base_reserve: 1000000000000000n, virtual_quote_reserve: 1000000000000n, creator_fee_bps: 0n } } }, state: { busy: false, sold: 0n }, status: 'Open', price: 10000000n }, locked: false, setLocked: () => {}, refresh: async () => calls.push('refreshed') });
  return { submit: () => form.props.onSubmit({ preventDefault() {} }), calls, states, stored, get written() { return written; } };
}

test('buy submits exact ABI arguments after trustline confirmation and refreshes after confirmation', async () => {
  const trade = renderTrade('buy');
  await trade.submit();
  assert.equal(trade.written.call.fn, 'buy');
  // The exact USDC budget is the on-chain payment cap.
  assert.deepEqual(Array.from(trade.written.call.args), [owner, '19999600007', '20000000']);
  assert.equal(trade.written.options.network, Networks.TESTNET);
  assert.deepEqual(trade.calls, ['trustline submitted', 'trustline-hash confirmed', 'trade submitted', 'trade-hash confirmed', 'refreshed']);
  assert.equal(trade.stored.size, 0);
});

test('sell passes seller, exact token amount and minimum pair receipt', async () => {
  const trade = renderTrade('sell');
  await trade.submit();
  assert.equal(trade.written.call.fn, 'sell');
  assert.deepEqual(Array.from(trade.written.call.args), [owner, '20000000', '29551500']);
  assert.deepEqual(trade.calls, ['trade submitted', 'trade-hash confirmed', 'refreshed']);
});

test('sell can create a missing receiving pair trustline without reading its SAC balance first', async () => {
  const trade = renderTrade('sell', '20000000', 'SUCCESS', true);
  await trade.submit();
  assert.equal(trade.written.call.fn, 'sell');
  assert.deepEqual(trade.calls, ['trustline submitted', 'trustline-hash confirmed', 'trade submitted', 'trade-hash confirmed', 'refreshed']);
});

test('a transferred token balance without enough curve purchases cannot submit a sell', async () => {
  const trade = renderTrade('sell', '10000000');
  await trade.submit();
  assert.equal(trade.written, undefined);
  assert.match(trade.states[5], /bought directly from this curve/);
});

test('an unresolved submitted trade preserves its hash and does not report success', async () => {
  const trade = renderTrade('sell', '20000000', 'NOT_FOUND');
  await trade.submit();
  assert.equal(trade.stored.size, 1);
  assert.equal([...trade.stored.values()][0], 'trade-hash');
  assert.match(trade.states[5], /still pending/);
  assert.ok(!trade.calls.includes('refreshed'));
});

const { buyAmountForBudget } = loadSource('buy-amount-for-budget.ts');
test('buy budget inversion fits fees and steep curves, including remaining inventory', () => {
  const unit=10_000_000n, base=100_000_000n*unit, reserve=100_000n*unit, capacity=50_000_000n*unit;
  for (const sold of [0n,capacity/2n,capacity-1000n]) for(const feeBps of [0n,10n,100n]) for(const budget of [1n,100n*unit,reserve*2n]) {
    const snapshot={config:{buckets:{curve:capacity},params:{curve:{virtual_base_reserve:base,virtual_quote_reserve:reserve,creator_fee_bps:feeBps}}},state:{sold}};
    const amount=buyAmountForBudget(snapshot,budget);
    const cost=s => (reserve*s+base-s-1n)/(base-s);
    const pay=a => {const gross=cost(sold+a)-cost(sold); return gross+(gross*feeBps+9999n)/10000n;};
    assert.ok(amount>=0n && amount<=capacity-sold);
    assert.ok(pay(amount)<=budget);
    if(amount<capacity-sold) assert.ok(pay(amount+1n)>budget);
  }
});

test('swap display rounds to at most three decimals without changing exact amount formatting', () => {
  for (const [raw, expected] of [
    [12345678n, '1.235'], [9999999n, '1'], [10000000n, '1'],
    [9007199254740993n, '900719925.474'], [0n, '0'], [-1n, '0'],
  ]) assert.equal(domain.formatAmount(raw, 3), expected);
  assert.equal(domain.formatAmount(9007199254740993n), '900719925.4740993');
});
