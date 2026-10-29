import { configurationModule, networkModule } from '../../../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url)),
  require = createRequire(import.meta.url);
const { Asset, Keypair, Networks } = require('@stellar/stellar-sdk');
const owner = Keypair.random().publicKey(),
  address = 'launch-contract';
const quote = { gross: '10000000', creator_fee: '0', user_amount: '10000000' };
function load(filename, mocks = {}, globals = {}) {
  if (filename.replaceAll('\\', '/').endsWith('/lib/api/config.ts')) return configurationModule;
  const path = resolve(directory, filename),
    module = { exports: {} };
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  runInNewContext(output, {
    module,
    exports: module.exports,
    Error,
    ...globals,
    require: (name) => name.endsWith('.module.css') ? { __esModule: true, default: { status: 'trade-status-popup', failed: 'trade-failed-popup' } } : name === '@/components/token-logo' ? { TokenLogo: 'TokenLogo' } : name === '@/lib/stellar/amount' ? load('../../../lib/stellar/amount.ts') : name === '@/lib/api/config' ? configurationModule : name === '@/lib/stellar/network' ? networkModule : name === '@/lib/base/amount' ? load('../../../lib/base/amount.ts') : name === '@/lib/api/client' ? { getApiNetwork: () => networkModule.API_NETWORK } : name === '@/lib/chain-address' ? { explorerUrl: (hash, network) => `https://stellar.expert/explorer/${network}/tx/${hash}` } :
      name in mocks
        ? mocks[name]
        : name.startsWith('.')
          ? load(resolve(dirname(path), `${name}${name === './transaction-hash' ? '.tsx' : '.ts'}`), mocks, globals)
          : require(name),
  });
  return module.exports;
}
function harness({
  side = 'buy',
  registrationStored = true,
  pending = null,
  confirmation = 'success',
  storageBlocked = false,
  balances,
  balanceStatus,
  paymentAsset = Asset.native(),
  status = 'Open',
  busy = false,
  entry = '1',
  slippage = '',
  connected = true,
  loginPending = false,
  writeGate,
  confirmGate,
  currentSold = 0n,
  walletBalance = 100000000n,
  currentPayment,
  feeBps = 0n,
  writeTimeout = false,
  rpcStatuses = ['NOT_FOUND'],
} = {}) {
  const events = [],
    states = [],
    values = [],
    refs = [],
    storage = new Map(),
    key = `launchpad:pending-trade:${Networks.TESTNET}:${address}:${owner}`;
  const requests = [];
  const rpcLookups = [];
  const timeoutHash = 'b'.repeat(64);
  const snapshot = {
    config: { buckets: { curve: 500000000000000n }, params: { curve: { virtual_base_reserve: 1000000000000000n, virtual_quote_reserve: 1000000000000n, creator_fee_bps: feeBps } } },
    state: { busy, sold: 0n, quote_reserve: 0n, creator_fees: 0n, team_claimed: 0n, buyer_count: 0n, graduated: false },
    status,
    price: 10000000n,
  };
  function buyQuote(amount, sold = 0n) {
    const { virtual_base_reserve: base, virtual_quote_reserve: reserve } = snapshot.config.params.curve;
    const cost = value => (reserve * value + base - value - 1n) / (base - value);
    const gross = cost(sold + amount) - cost(sold);
    const fee = (gross * feeBps + 9999n) / 10000n;
    return { gross, creator_fee: fee, user_amount: gross + fee };
  }
  if (pending) storage.set(key, pending);
  let stateIndex = 0, refIndex = 0,
    writes = 0;
  const jsx = (type, props) => ({ type, props });
  const mockUi = (name) => ({ [name]: name });
  const mocks = {
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in values)) values[index] =
          index < 2 ? entry : index === 2 ? slippage : typeof initial === 'function' ? initial() : initial;
        return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; states.push(values[index]); }];
      },
      useRef: (initial) => { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@bluxcc/react': {
      useBlux: () => ({
        user: connected ? { address: owner } : null,
        isReady: true,
        sendTransaction() {
          throw new Error('Unexpected trustline submission');
        },
      }),
      useWriteContract: () => ({
        mutateAsync: async (request) => {
          assert.equal(request.call.address, address);
          requests.push(request);
          events.push('broadcast');
          writes++;
          if (writeGate) await writeGate;
          if (writeTimeout) throw new Error(`BLUX: Timed out waiting for transaction ${timeoutHash} to finalize.`);
          return { hash: 'new-hash', returnValue: async () => { throw new Error('Do not use the unbounded Blux result waiter'); } };
        },
      }),
      useReadContracts: (calls) => ({
        data: { values: [side === 'buy' ? buyQuote(BigInt(calls[0].args[0])) : quote] },
        isFetching: false,
      }),
      readContracts: async (calls) => ({
        values: calls.map(call => call.fn === 'get_state'
          ? { ...snapshot.state, sold: currentSold }
          : call.fn === 'quote_buy'
            ? { ...buyQuote(BigInt(call.args[0]), currentSold), ...(currentPayment === undefined ? {} : { user_amount: currentPayment }) }
            : call.fn === 'quote_sell' ? quote : walletBalance),
      }),
    },
    '@/components/ui/button': mockUi('Button'),
    '@/components/ui/skeleton': mockUi('Skeleton'),
    '@/components/ui/input': mockUi('Input'),
    '@/components/form-controls': { FieldSurface: 'FieldSurface', FormInput: 'Input' },
    '@/components/ui/input-group': { InputGroup: 'InputGroup', InputGroupAddon: 'InputGroupAddon', InputGroupInput: 'InputGroupInput' },
    '@/features/launches/trading/trade-value': { TradeValue: 'TradeValue' },
    '@/features/launches/trading/trade-tooltip': { TradeTooltipText: 'TradeTooltipText' },
    '@/features/launches/trading/trade-feedback': { TradeFeedback: 'TradeFeedback' },
    '@/features/launches/trading/trade-token-pill': { TradeTokenPill: 'TradeTokenPill' },
    '@/lib/launchpad': { useLaunchpad: () => ({ loginPending, login: async (destination) => { events.push(`connect:${destination}`); } }) },
    './trade-result-dialog': { TradeResultDialog: 'TradeResultDialog' },
    '@/components/token-logo': mockUi('TokenLogo'),
    '@/features/launches/trading/trade-quote-details': { TradeQuoteDetails: 'TradeQuoteDetails' },
    '@/features/launches/trading/trade-disclosure': mockUi('TradeDisclosure'),
    '@/components/ui/field': Object.fromEntries(
      ['Field', 'FieldDescription', 'FieldGroup', 'FieldLabel'].map((n) => [
        n,
        n,
      ]),
    ),
    '@/features/launches/hooks/queries': { usePageVisible: () => true },
    '@/lib/api/launches/trade-queue': {
      enqueueTrade(network, id, hash, trader, slug) {
        assert.equal(slug, 'blue-man');
        events.push(`queue:${hash}`);
        assert.equal(network, 'testnet');
        assert.equal(id, address);
        assert.equal(trader, owner);
        return registrationStored;
      },
    },
    '@/lib/stellar/clients': {
      API_NETWORK: 'testnet',
      NETWORK: Networks.TESTNET,
      soroban: { getTransaction: async (hash) => {
        rpcLookups.push(hash);
        return { status: rpcStatuses[Math.min(rpcLookups.length - 1, rpcStatuses.length - 1)] };
      } },
    },
    './trade': {
      confirmTransaction: async (hash) => {
        events.push(`confirm:${hash}`);
        assert.ok(events.includes(`queue:${hash}`));
        if (confirmGate) await confirmGate;
        if (writeTimeout) return load('../../../lib/stellar/confirmation.ts', mocks, globals).confirmTransaction(hash);
        if (confirmation !== 'success') throw new Error('Still pending');
      },
      ensureTradeTrustlines: async () => ({}),
      checkReceivingCapacity() {},
    },
  };
  const globals = {
    setTimeout: (resolve, ms) => ms === 1000 ? resolve() : 0,
    clearTimeout,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem(key, value) {
        if (storageBlocked) throw new Error('Storage blocked');
        storage.set(key, value);
      },
      removeItem(key) {
        if (storageBlocked) throw new Error('Storage blocked');
        storage.delete(key);
      },
    },
  };
  const { TradeForm, TradeFormView } = load('trade-form.tsx', mocks, globals);
  const render = () => {
    stateIndex = refIndex = 0;
    const view = TradeForm({
    address,
    slug: 'blue-man',
    network: 'testnet',
    side,
    snapshot,
    balances,
    balanceStatus,
    tokens: {
      asset: Asset.native(),
      pair: paymentAsset,
      assetSymbol: 'TOK',
      pairSymbol: paymentAsset.getCode(),
    },
    locked: false,
    setLocked() {},
    refresh: async () => events.push('refresh'),
    });
    return TradeFormView(view.props);
  };
  const form = render();
  return {
    form,
    render,
    events,
    states,
    requests,
    snapshot,
    rpcLookups,
    storage,
    key,
    writes: () => writes,
    submit: () => form.props.onSubmit({ preventDefault() {} }),
  };
}
for (const side of ['buy', 'sell'])
  test(`${side} confirms the submitted hash without saving pending state`, async () => {
    const h = harness({ side });
    await h.submit();
    assert.deepEqual(h.events, [
      'broadcast',
      'queue:new-hash',
      'confirm:new-hash',
      'refresh',
    ]);
    assert.equal(h.writes(), 1);
    assert.ok(h.states.some(value => value?.hash === 'new-hash' && value?.side === side), 'Only a confirmed trade shows success in the dialog');
    const confirmation = h.states.find(value => value?.hash === 'new-hash');
    assert.equal(confirmation.token.symbol, 'TOK');
    assert.equal(confirmation.token.amount, BigInt(h.requests[0].call.args[1]), 'Summary amount matches the exact submitted token quantity');
    assert.equal(h.storage.has(h.key), false);
    assert.ok(
      h.states.includes(`${side === 'buy' ? 'Buy' : 'Sell'} confirmed.`),
    );
  });
test('registration persistence failure never becomes a false on-chain failure or another broadcast', async () => {
  const h = harness({ registrationStored: false, storageBlocked: true });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.ok(h.states.includes('Buy confirmed.'));
  assert.ok(h.events.includes('refresh'));
});
test('unresolved confirmation shows an error without saving pending state', async () => {
  const h = harness({ confirmation: 'pending' });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.equal(h.storage.has(h.key), false);
  assert.ok(!h.states.some(value => value?.hash === 'new-hash'), 'Unresolved trades must not open a success dialog');
});

for (const side of ['buy', 'sell']) test(`${side} recovers a Blux timeout by checking the submitted hash`, async () => {
  const h = harness({ side, writeTimeout: true, rpcStatuses: ['NOT_FOUND', 'NOT_FOUND', 'SUCCESS'] });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.deepEqual(h.rpcLookups, Array(3).fill('b'.repeat(64)));
  assert.equal(h.storage.has(h.key), false);
  assert.equal(tradeDialog(h).confirmation.hash, 'b'.repeat(64));
  assert.equal(tradeDialog(h).confirmation.side, side);
});

test('unresolved Blux buy timeout shows an error without persisting or rechecking', async () => {
  const h = harness({ writeTimeout: true });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.equal(h.storage.has(h.key), false);
  const dialog = tradeDialog(h);
  assert.equal(dialog.confirmation, undefined);
  assert.equal(dialog.submittedHash, 'b'.repeat(64));
  assert.equal(dialog.awaitingApproval, false);
});
test('stale stored hashes never block or replace a new trade', async () => {
  const h = harness({ pending: 'old-hash' });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.deepEqual(h.events, ['broadcast', 'queue:new-hash', 'confirm:new-hash', 'refresh']);
  assert.equal(elements(h.render()).some(node => content(node).includes('Check submitted trade')), false);
});

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat().flatMap(elements)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (node && typeof node === 'object') return content(node.props?.children);
  return node == null || typeof node === 'boolean' ? '' : String(node);
}

function walletContent(form) {
  return content(elements(form).find(node => node.props?.role === 'status'));
}

test('initial wallet reads show accessible skeletons without unavailable messages or retry controls', () => {
  const h = harness({ balanceStatus: { held: 'loading', pairHeld: 'loading', position: 'loading' } });
  assert.equal(elements(h.form).filter(node => node.type === 'Skeleton').length, 1);
  assert.doesNotMatch(walletContent(h.form), /TOK/);
  assert.match(content(h.form), /Loading XLM balance/);
  assert.doesNotMatch(content(h.form), /balance unavailable|Retry|Try again/);
});

test('buy shows only USDC and keeps presets available when the project token has no trustline', () => {
  const h = harness({ paymentAsset: new Asset('USDC', owner), balances: { pairHeld: 123456789n }, balanceStatus: { held: 'error', pairHeld: 'ready', position: 'error' } });
  assert.equal(walletContent(h.form), 'Balance: 12.346 USDC');
  assert.equal(elements(h.form).find(node => node.type === 'Button' && node.props.children === '100%').props.disabled, false);
});

test('sell shows only its unavailable sellable balance and disables sell presets', () => {
  const h = harness({ side: 'sell', balances: { held: 20000000n, pairHeld: 30000000n }, balanceStatus: { held: 'ready', pairHeld: 'ready', position: 'error' } });
  assert.equal(walletContent(h.form), 'Sellable balance unavailable');
  assert.equal(elements(h.form).find(node => node.type === 'Button' && node.props.children === '100%').props.disabled, true);
});

test('failed refreshes keep values visible with an outdated label and no new retry button', () => {
  const h = harness({ side: 'sell', balances: { held: 20000000n, pairHeld: 30000000n, position: 10000000n }, balanceStatus: { held: 'ready', pairHeld: 'stale', position: 'stale' } });
  assert.match(walletContent(h.form), /Sellable: 1 TOK \(outdated\)/);
  assert.doesNotMatch(walletContent(h.form), /XLM/);
  assert.match(content(h.form), /Balance refresh failed/);
  assert.doesNotMatch(content(h.form), /balance unavailable|Retry|Try again/);
});

test('zero wallet balances remain valid displayed amounts', () => {
  const h = harness({ side: 'sell', balances: { held: 0n, pairHeld: 0n, position: 0n } });
  assert.equal(walletContent(h.form), 'Sellable: 0 TOK');
  assert.doesNotMatch(content(h.form), /unavailable|outdated/);
});

test('sell shows eligible tokens only, excluding extra held tokens and payment asset errors', () => {
  const h = harness({ side: 'sell', balances: { held: 20000000n, position: 10000000n }, balanceStatus: { held: 'ready', pairHeld: 'error', position: 'ready' } });
  assert.equal(walletContent(h.form), 'Sellable: 1 TOK');
});

test('an unrelated stale token balance does not mark the buy balance as outdated', () => {
  const h = harness({ balances: { held: 20000000n, pairHeld: 30000000n }, balanceStatus: { held: 'stale', pairHeld: 'ready', position: 'error' } });
  assert.equal(walletContent(h.form), 'Balance: 3 XLM');
});

for (const side of ['buy', 'sell']) test(`${side} shows the current token price before an amount or wallet connection`, () => {
  const h = harness({ side, entry: '', connected: false });
  const price = h.form.props.children.find(node => node?.type === 'dl');
  assert.ok(price, 'Price stays outside the collapsed quote details');
  assert.match(content(price), /Current price/);
  assert.match(content(price), /1 TOK ≈ 1 XLM/);
});

test('sell shows the net quoted price per token instead of the current marginal price', () => {
  const h = harness({ side: 'sell', entry: '2' });
  const price = h.form.props.children.find(node => node?.type === 'dl');
  assert.match(content(price), /Quoted price/);
  assert.match(content(price), /1 TOK ≈ 0.5 XLM/);
});

test('balance presets retain exact stroops on both sides', () => {
  for (const side of ['buy', 'sell']) {
    for (const [percent, expected] of [[25, '3.0864197'], [50, '6.1728394'], [75, '9.2592591'], [100, '12.3456789']]) {
      const h = harness({ side, balances: { held: 123456790n, position: 123456789n, pairHeld: 123456789n } });
      const preset = elements(h.form).find(node => node.type === 'Button' && node.props.children === percent + '%');
      assert.equal(preset.props.disabled, false);
      preset.props.onClick();
      assert.ok(h.states.includes(expected), side + ' ' + percent + '% must round down in raw units');
    }
  }
});

test('100% USDC buy caps payment at 1.11 and applies 1% slippage to tokens received', async () => {
  const h = harness({ paymentAsset: new Asset('USDC', owner), entry: '1.11', slippage: '1', balances: { pairHeld: 11100000n }, walletBalance: 11100000n, feeBps: 100n });
  const preset = elements(h.form).find(node => node.type === 'Button' && node.props.children === '100%');
  preset.props.onClick();
  assert.ok(h.states.includes('1.11'));
  const action = elements(h.form).find(node => node.type === 'Button' && node.props.type === 'submit');
  assert.equal(action.props.disabled, false);
  assert.equal(action.props.children, 'Buy TOK');
  const { buyAmountForBudget } = load('buy-amount-for-budget.ts');
  const { formatAmount } = load('contract.ts');
  const expected = buyAmountForBudget(h.snapshot, 11100000n);
  const minimum = expected * 9900n / 10000n;
  assert.match(content(h.form), new RegExp(formatAmount(minimum, 3).replace('.', '\\.')));
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.deepEqual(Array.from(h.requests[0].call.args), [owner, expected.toString(), '11100000']);
});

test('buy reduces the token fill within slippage when the curve price rises', async () => {
  const h = harness({ slippage: '1', currentSold: 1000000000000n });
  const { buyAmountForBudget } = load('buy-amount-for-budget.ts');
  const original = buyAmountForBudget(h.snapshot, 10000000n);
  const current = buyAmountForBudget({ ...h.snapshot, state: { ...h.snapshot.state, sold: 1000000000000n } }, 10000000n);
  assert.ok(current < original && current >= original * 9900n / 10000n);
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.deepEqual(Array.from(h.requests[0].call.args), [owner, current.toString(), '10000000']);
});

test('buy rejects a token fill below the slippage minimum', async () => {
  const h = harness({ slippage: '1', currentSold: 10000000000000n });
  await h.submit();
  assert.equal(h.writes(), 0);
  assert.match(tradeDialog(h).error, /minimum tokens/);
});

test('zero slippage rejects any reduction in the quoted token amount', async () => {
  const h = harness({ slippage: '0', currentSold: 1000000000n });
  await h.submit();
  assert.equal(h.writes(), 0);
  assert.match(tradeDialog(h).error, /minimum tokens/);
});

test('buy rejects a fresh quote above the entered USDC budget', async () => {
  const h = harness({ currentPayment: 10000001n });
  await h.submit();
  assert.equal(h.writes(), 0);
  assert.match(tradeDialog(h).error, /budget/);
});

test('buy rejects an entered amount above the available USDC balance', async () => {
  const h = harness({ paymentAsset: new Asset('USDC', owner), balances: { pairHeld: 9999999n }, walletBalance: 9999999n });
  const action = elements(h.form).find(node => node.type === 'Button' && node.props.type === 'submit');
  assert.equal(action.props.children, 'Insufficient USDC balance');
  assert.equal(action.props.disabled, true);
  await h.submit();
  assert.equal(h.writes(), 0);
});

test('100% sell uses the lesser of held tokens and eligible curve purchases without losing stroops', () => {
  for (const [held, position] of [[90071992547409930n, 90071992547409931n], [90071992547409931n, 90071992547409930n]]) {
    const h = harness({ side: 'sell', balances: { held, position, pairHeld: 0n } });
    const max = elements(h.form).find(node => node.type === 'Button' && node.props.children === '100%');
    assert.equal(max.props.disabled, false);
    max.props.onClick();
    assert.ok(h.states.includes('9007199254.740993'));
  }
});

for (const options of [{ status: 'Scheduled' }, { status: 'Graduated' }, { status: 'Failed', side: 'buy' }, { busy: true }])
  test(`unavailable form ${JSON.stringify(options)} cannot broadcast`, async () => {
    const h = harness(options);
    const cta = elements(h.form).find(node => node.type === 'Button' && node.props.type === 'submit');
    assert.equal(cta.props.disabled, true);
    await h.submit();
    assert.equal(h.writes(), 0);
  });

test('invalid input cannot display a cached quote as the current estimate', () => {
  const h = harness({ entry: 'invalid' });
  assert.ok(!elements(h.form).some(node => node.type === 'dt' && node.props.children === 'Creator fee · included'));
});

for (const side of ['buy', 'sell']) test(`signed-out ${side} connects the wallet without requiring an amount or broadcasting`, async () => {
  const h = harness({ side, connected: false, entry: '' });
  const action = elements(h.form).find(node => node.type === 'Button' && node.props.children === 'Connect Wallet');
  assert.ok(action);
  assert.equal(action.props.type, 'button');
  assert.equal(action.props.disabled, false);
  action.props.onClick();
  assert.deepEqual(h.events, ['connect:/projects/blue-man?network=testnet']);
  await h.submit();
  assert.equal(h.writes(), 0);
});
test('wallet connection cannot be started twice while connecting', () => {
  const h = harness({ connected: false, loginPending: true });
  const action = elements(h.form).find(node => node.type === 'Button' && node.props.children === 'Connecting…');
  assert.equal(action.props.disabled, true);
});
for (const side of ['buy', 'sell']) test(`${side} result dialog displays the confirmed transaction and supports dismissal`, () => {
  const jsx=(type,props)=>({type,props});
  const dialogNames=['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription','DialogFooter','DialogClose'];
  const { TradeResultDialog } = load('trade-result-dialog.tsx', {
    'react/jsx-runtime': {jsx,jsxs:jsx},
    '@/components/app-dialog': Object.fromEntries(['AppDialogContent', 'AppDialogHeader', 'AppDialogFooter'].map(name => [name, name])),
    '@/components/ui/dialog': Object.fromEntries(dialogNames.map(name=>[name,name])),
    '@/components/ui/button': {Button:'Button'},
    '@/components/ui/spinner': {Spinner:'Spinner'},
    'motion/react': { motion: { div: 'div', span: 'span', p: 'p' }, AnimatePresence: 'AnimatePresence', useReducedMotion: () => false },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/features/launches/trading/trade-transition': { tradeTransition: { duration: 0.24 } },
    './transaction-hash': {TransactionHash:'TransactionHash'},
  });
  let dismissed=false;
  const dialog=TradeResultDialog({confirmation:{hash:'confirmed-hash',side},onClose:()=>{dismissed=true;}});
  assert.equal(dialog.props.open,true);
  assert.ok(elements(dialog).some(node=>node.type==='span' && node.props.children===`${side==='buy'?'Buy':'Sell'} confirmed`));
  assert.ok(elements(dialog).some(node=>node.type==='TransactionHash' && node.props.hash==='confirmed-hash'));
  dialog.props.onOpenChange(false);
  assert.equal(dismissed,true);
});

for (const slippage of ['-1', '100', '1.001', 'abc'])
  test('invalid slippage ' + slippage + ' prevents a trade', async () => {
    const h = harness({ slippage });
    await h.submit();
    assert.equal(h.writes(), 0);
    const action = elements(h.form).find(node => node.type === 'Button' && node.props.type === 'submit');
    assert.equal(action.props.disabled, true);
  });

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tradeDialog = h => elements(h.render()).find(node => node.type === 'TradeResultDialog').props;
for (const side of ['buy', 'sell']) test(`${side} keeps one dialog open through checks, wallet approval, network and success`, async () => {
  const wallet = deferred(), network = deferred();
  const h = harness({ side, writeGate: wallet.promise, confirmGate: network.promise });
  const submission = h.submit();
  let dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.working, true);
  assert.equal(dialog.confirmation, undefined);
  dialog.onClose();
  assert.equal(tradeDialog(h).open, true);
  await new Promise(resolve => setImmediate(resolve));
  dialog = tradeDialog(h);
  assert.equal(dialog.awaitingApproval, true);
  assert.ok(dialog.message.includes('transaction in your wallet'));
  wallet.resolve();
  await new Promise(resolve => setImmediate(resolve));
  dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.awaitingApproval, false);
  assert.equal(dialog.submittedHash, 'new-hash');
  assert.ok(dialog.message.includes('Waiting for confirmation'));
  assert.equal(dialog.confirmation, undefined);
  assert.equal(elements(h.render()).some(node => node.type === 'p' && Array.isArray(node.props.children) && node.props.children.includes('new-hash')), false);
  network.resolve();
  await submission;
  dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.working, false);
  assert.equal(dialog.confirmation.hash, 'new-hash');
  assert.equal(dialog.confirmation.side, side);
  dialog.onClose();
  assert.equal(tradeDialog(h).open, false);
  assert.equal(tradeDialog(h).confirmation.hash, 'new-hash', 'Keep success visible throughout the closing animation');
  tradeDialog(h).onClosed();
  assert.equal(tradeDialog(h).confirmation, undefined, 'Clear the result only after the modal has closed');
  assert.equal(h.writes(), 1);
});

test('wallet rejection remains visible in the dialog without fabricating a submitted trade', async () => {
  const wallet = deferred();
  const h = harness({ writeGate: wallet.promise });
  const submission = h.submit();
  await new Promise(resolve => setImmediate(resolve));
  wallet.reject(new Error('User rejected the transaction'));
  await submission;
  const dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.working, false);
  assert.equal(dialog.awaitingApproval, false);
  assert.equal(dialog.confirmation, undefined);
  assert.equal(dialog.submittedHash, undefined);
  assert.equal(dialog.error, 'The trade was cancelled in your wallet.');
});

test('unresolved confirmation ends with an error and no manual recheck', async () => {
  const h = harness({ confirmation: 'pending' });
  await h.submit();
  let dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.working, false);
  assert.equal(dialog.submittedHash, 'new-hash');
  assert.equal(dialog.confirmation, undefined);
  assert.ok(dialog.error);
  assert.equal(dialog.onCheckPending, undefined);
  assert.equal(h.storage.size, 0);
  assert.equal(h.writes(), 1);
});

test('dialog supports loading, Blux focus, unresolved confirmation, failure and safe dismissal', () => {
  const jsx = (type, props) => ({ type, props });
  let reduced = false;
  const names = ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter', 'DialogClose'];
  const { TradeResultDialog } = load('trade-result-dialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/app-dialog': Object.fromEntries(['AppDialogContent', 'AppDialogHeader', 'AppDialogFooter'].map(name => [name, name])),
    '@/components/ui/dialog': Object.fromEntries(names.map(name => [name, name])),
    '@/components/ui/button': { Button: 'Button', buttonVariants: () => '' },
    '@/components/ui/spinner': { Spinner: 'Spinner' },
    'motion/react': { motion: { div: 'div', span: 'span', p: 'p' }, AnimatePresence: 'AnimatePresence', useReducedMotion: () => reduced },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/features/launches/trading/trade-transition': { tradeTransition: { duration: 0.24 } },
    './transaction-hash': { TransactionHash: 'TransactionHash' },
  });
  let closed = 0;
  const props = { open: true, side: 'buy', onClose: () => closed++ };
  const loading = TradeResultDialog({ ...props, working: true, message: 'Checking your wallet' });
  assert.ok(elements(loading).some(node => node.props?.role === 'status' && node.props.children === 'Checking your wallet'));
  assert.ok(!elements(loading).some(node => node.type === 'DialogFooter'), 'Modal uses one surface without a separate footer');
  assert.ok(elements(loading).some(node => node.type === 'AppDialogContent'), 'Uses the shared launch modal frame');
  assert.ok(elements(loading).some(node => node.props?.className?.includes('min-h-[210px]') && node.props.className.includes('justify-center')), 'Processing stays centered within the stable trade dialog');
  assert.equal(elements(loading).find(node => node.type === 'AppDialogContent').props.showCloseButton, false);
  assert.equal(elements(loading).find(node => node.type === 'AppDialogContent').props.presentation, undefined, 'Trade feedback inherits the shared dialog presentation');
  assert.equal(elements(loading).find(node => node.type === 'AppDialogContent').props.animateSize, false, 'Status changes preserve the fixed dialog dimensions');
  assert.ok(!elements(loading).some(node => node.type === 'Button' || node.type === 'DialogClose'), 'Processing does not offer an unsafe close or another trade');
  assert.equal(loading.props.modal, true);
  assert.equal(loading.props.disablePointerDismissal, true);
  loading.props.onOpenChange(false);
  assert.equal(closed, 0);
  const approval = TradeResultDialog({ ...props, working: true, awaitingApproval: true });
  assert.equal(approval.props.modal, false);
  const approvalNodes = elements(approval);
  assert.ok(approvalNodes.find(node => node.type === 'AppDialogContent').props.className.includes('trade-status-popup'));
  assert.ok(approvalNodes.some(node => node.type === 'DialogDescription' && node.props.children === 'Open your wallet and approve the transaction to continue.' && !node.props.className.includes('sr-only')));
  approval.props.onOpenChange(false);
  assert.equal(closed, 0, 'Wallet approval preserves its existing dismissal restriction');
  for (const phase of [
    { working: true },
    { working: true, awaitingApproval: true },
    { working: true, trustHash: 'trustline-hash' },
    { working: true, submittedHash: 'submitted-hash' },
  ]) {
    const nodes = elements(TradeResultDialog({ ...props, ...phase }));
    assert.equal(nodes.find(node => node.type === 'AppDialogContent').props.showCloseButton, !!phase.submittedHash, 'Pending transactions expose the corner close control only after submission');
    const spinners = nodes.filter(node => node.type === 'Spinner');
    assert.equal(spinners.length, 1, 'Every in-progress phase shows the same single loader');
    assert.equal(spinners[0].props.className, 'size-11 motion-reduce:animate-none');
    assert.ok(nodes.some(node => node.props?.className?.includes('text-primary')), 'All pending phases use the same lime spinner');
    if (!phase.awaitingApproval) {
      assert.ok(content(TradeResultDialog({ ...props, ...phase })).includes('Completing transaction'));
      assert.ok(nodes.some(node => node.type === 'DialogDescription' && node.props.children === 'Your transaction is being processed.'));
    }
    assert.ok(!nodes.some(node => node.type === 'DialogClose'), 'Pending states have no Hide or Close button');
    assert.ok(!nodes.some(node => node.props?.className?.includes('min-h-11')), 'Pending states do not reserve an empty action row');
    assert.ok(nodes.some(node => node.props?.className?.includes('size-14 bg-black text-primary')), 'The lime spinner has a black circular background');
  }
  const pending = TradeResultDialog({ ...props, submittedHash: 'original-hash', error: 'There was a problem confirming the transaction within 10 seconds.' });
  assert.ok(elements(pending).some(node => node.type === 'span' && node.props.children === 'Trade not completed'));
  assert.equal(content(pending).includes('Check submitted trade'), false);
  assert.ok(!elements(pending).some(node => node.type === 'Spinner'));
  assert.ok(elements(pending).some(node => node.type === 'TransactionHash' && node.props.compact === true));
  assert.ok(elements(pending).some(node => node.type === 'TransactionHash' && node.props.hash === 'original-hash'));
  const failed = TradeResultDialog({ ...props, error: 'Wallet cancelled' });
  assert.ok(elements(failed).some(node => node.props?.role === 'alert' && node.props.children === 'Wallet cancelled'));
  const failureClose = elements(failed).find(node => node.type === 'DialogClose');
  assert.notEqual(failureClose.props.render.props.variant, 'outline');
  assert.ok(failureClose.props.render.props.className.includes('w-full'));
  assert.equal(elements(failed).find(node => node.type === 'AppDialogContent').props.showCloseButton, true);
  failed.props.onOpenChange(false);
  assert.equal(closed, 1);
  const refreshed = TradeResultDialog({ ...props, confirmation: { hash: 'confirmed-hash', side: 'buy' }, error: 'Refresh failed' });
  assert.ok(elements(refreshed).some(node => node.type === 'span' && node.props.children === 'Buy confirmed'));
  assert.ok(elements(refreshed).some(node => node.props?.role === 'alert' && node.props.children.includes('balances could not refresh')));
  reduced = true;
  const quiet = TradeResultDialog({ ...props, confirmation: { hash: 'confirmed-hash', side: 'buy' } });
  assert.ok(!elements(quiet).some(node => node.type === 'Spinner'), 'Confirmed trades replace the loader with success');
  assert.ok(!elements(failed).some(node => node.type === 'Spinner'), 'Failed trades do not imply ongoing processing');
  const animated = elements(quiet).filter(node => node.props?.initial !== undefined && node.props.transition);
  assert.equal(animated.length, 0, 'Status content delegates motion to the reduced-motion-aware shared frame');
});

test('confirmed trades retain the hash and explorer action without project navigation', () => {
  const jsx = (type, props) => ({ type, props });
  const { TradeResultDialog } = load('trade-result-dialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/app-dialog': { AppDialogContent: 'AppDialogContent' },
    '@/components/ui/dialog': Object.fromEntries(
      ['Dialog', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogClose'].map(name => [name, name]),
    ),
    '@/components/ui/button': { Button: 'Button', buttonVariants: () => '' },
    '@/components/ui/spinner': { Spinner: 'Spinner' },
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    './transaction-hash': { TransactionHash: 'TransactionHash' },
  });
  const hash = '1234567890abcdef'.repeat(4);
  let closed = false;
  const dialog = TradeResultDialog({
    confirmation: { hash, side: 'sell' },
    onClose() { closed = true; },
  });
  const nodes = elements(dialog);
  assert.ok(!nodes.some(node => node.props?.['aria-label'] === `Transaction hash: ${hash}`));
  assert.ok(!content(dialog).includes(`${hash.slice(0, 12)}…${hash.slice(-12)}`));
  assert.ok(nodes.some(node => node.type === 'DialogDescription' && node.props.children === 'Your transaction was successful.'));
  const frame = nodes.find(node => node.type === 'AppDialogContent');
  assert.ok(frame.props.className.includes('trade-status-popup'));
  assert.equal(frame.props.animateSize, false);
  for (const phase of [
    { working: true },
    { working: true, awaitingApproval: true },
    { working: true, submittedHash: hash },
    { confirmation: { hash, side: 'buy' } },
    { confirmation: { hash, side: 'sell' } },
    { error: 'Wallet cancelled' },
  ]) {
    const phaseNodes = elements(TradeResultDialog({ ...phase, open: true, onClose() {} }));
    const phaseFrame = phaseNodes.find(node => node.type === 'AppDialogContent');
    assert.equal(phaseFrame.props.className, phase.error ? 'trade-status-popup trade-failed-popup border border-border ring-0' : frame.props.className);
    assert.equal(phaseFrame.props.animateSize, false);
    if (phase.confirmation) {
      assert.ok(phaseNodes.some(node => node.props?.className?.includes('grid-cols-2')));
      assert.ok(phaseNodes.some(node => node.type === 'span' && node.props.children === `${phase.confirmation.side === 'buy' ? 'Buy' : 'Sell'} confirmed`));
    }
  }
  assert.ok(nodes.some(node => node.type === 'TransactionHash' && node.props.hash === hash && node.props.label === 'See in explorer'));
  assert.ok(!content(dialog).includes('View project'));
  assert.ok(nodes.some(node => node.type === 'DialogClose' && content(node).includes('Done')));
  dialog.props.onOpenChange(false);
  assert.equal(closed, true);
  assert.equal(tradeDialog(harness()).projectHref, undefined);
});

test('success summary rounds to three decimals and omits hashes and missing token data', () => {
  const jsx = (type, props) => ({ type, props });
  const { TradeResultDialog } = load('trade-result-dialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/app-dialog': { AppDialogContent: 'AppDialogContent' },
    '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogClose'].map(name => [name, name])),
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/spinner': { Spinner: 'Spinner' },
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    './transaction-hash': { TransactionHash: 'TransactionHash' },
  });
  for (const side of ['buy', 'sell']) {
    const tree = TradeResultDialog({ confirmation: { hash: 'actual-hash', side, token: { symbol: 'LONG_TOKEN_SYMBOL', amount: 9223372036854775807n } }, tokenLogo: 'https://example.com/token.png', tokenSeed: 'actual-contract', onClose() {} });
    assert.ok(content(tree).includes('922,337,203,685.478'));
    assert.ok(!content(tree).includes('Transaction hash'));
    assert.ok(!content(tree).includes('actual-hash'));
    assert.ok(content(tree).includes('LONG_TOKEN_SYMBOL'));
    const logo = elements(tree).find(node => node.type === 'TokenLogo');
    assert.equal(logo.props.logo, 'https://example.com/token.png');
    assert.equal(logo.props.seed, 'actual-contract');
    assert.equal(logo.props.size, 36);
    assert.ok(content(tree).includes(side === 'buy' ? 'Purchased' : 'Sold'));
    assert.ok(elements(tree).some(node => node.type === 'TransactionHash' && node.props.hash === 'actual-hash'));
    for (const [amount, expected] of [[10000000n, '1.000'], [12000000n, '1.200'], [19999999n, '2.000']]) {
      const rounded = TradeResultDialog({ confirmation: { hash: 'actual-hash', side, token: { symbol: 'TOK', amount } }, onClose() {} });
      assert.ok(content(rounded).includes(expected));
    }
    const fallback = TradeResultDialog({ confirmation: { hash: 'actual-hash', side }, onClose() {} });
    assert.ok(!content(fallback).includes('Amount'));
    assert.ok(!content(fallback).includes('Purchased'));
    assert.ok(!content(fallback).includes('Sold'));
  }
});

test('compact explorer actions use the selected network and do not dismiss or resubmit the trade', () => {
  const jsx = (type, props) => ({ type, props });
  const { TransactionHash } = load('transaction-hash.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/ui/button': { buttonVariants: () => '' },
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
  });
  const link = TransactionHash({ hash: 'real-hash', label: 'See in explorer', compact: true });
  assert.equal(link.type, 'a');
  assert.equal(link.props.href, `https://stellar.expert/explorer/${networkModule.API_NETWORK}/tx/real-hash`);
  assert.equal(link.props.target, '_blank');
  assert.equal(link.props.title, undefined, 'The compact explorer action does not expose the hash in a tooltip');
  assert.equal(link.props.onClick, undefined);
});
