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
    require: (name) =>
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
  status = 'Open',
  busy = false,
  entry = '1',
  slippage = '',
  connected = true,
  loginPending = false,
  writeGate,
  confirmGate,
} = {}) {
  const events = [],
    states = [],
    values = [],
    refs = [],
    storage = new Map(),
    key = `launchpad:pending-trade:${Networks.TESTNET}:${address}:${owner}`;
  if (pending) storage.set(key, pending);
  let stateIndex = 0, refIndex = 0,
    writes = 0;
  const jsx = (type, props) => ({ type, props });
  const mockUi = (name) => ({ [name]: name });
  const mocks = {
    './trade-form.module.css': { default: { pay: 'pay', presets: 'presets' } },
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
        mutateAsync: async () => {
          events.push('broadcast');
          writes++;
          if (writeGate) await writeGate;
          return { hash: 'new-hash' };
        },
      }),
      useReadContracts: () => ({
        data: { values: [quote] },
        isFetching: false,
      }),
      readContracts: async () => ({
        values: [quote, '100000000', '100000000', '100000000'],
      }),
    },
    '@/components/ui/button': mockUi('Button'),
    '@/components/ui/input': mockUi('Input'),
    '@/components/ui/input-group': { InputGroup: 'InputGroup', InputGroupAddon: 'InputGroupAddon', InputGroupInput: 'InputGroupInput' },
    '@/features/launches/trading/trade-value': { TradeValue: 'TradeValue' },
    '@/features/launches/trading/trade-feedback': { TradeFeedback: 'TradeFeedback' },
    '@/features/launches/trading/trade-token-pill': { TradeTokenPill: 'TradeTokenPill' },
    '@/lib/launchpad': { useLaunchpad: () => ({ loginPending, login: async (destination) => { events.push(`connect:${destination}`); } }) },
    './trade-result-dialog': { TradeResultDialog: 'TradeResultDialog' },
    '@/components/token-logo': mockUi('TokenLogo'),
    '@/features/launches/trading/trade-disclosure': mockUi('TradeDisclosure'),
    '@/components/ui/field': Object.fromEntries(
      ['Field', 'FieldDescription', 'FieldGroup', 'FieldLabel'].map((n) => [
        n,
        n,
      ]),
    ),
    '@/features/launches/hooks/queries': { usePageVisible: () => true },
    '@/lib/api/launches/trade-queue': {
      enqueueTrade(network, id, hash, trader) {
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
      soroban: { getTransaction: async () => ({ status: 'NOT_FOUND' }) },
    },
    './trade': {
      confirmTransaction: async (hash) => {
        events.push(`confirm:${hash}`);
        assert.ok(events.includes(`queue:${hash}`));
        if (confirmGate) await confirmGate;
        if (confirmation !== 'success') throw new Error('Still pending');
      },
      ensureTradeTrustlines: async () => ({}),
      checkReceivingCapacity() {},
    },
  };
  const globals = {
    setTimeout,
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
  const { TradeForm } = load('trade-form.tsx', mocks, globals);
  const render = () => {
    stateIndex = refIndex = 0;
    return TradeForm({
    address,
    network: 'testnet',
    side,
    snapshot: { config: { buckets: { curve: 500000000000000n }, params: { curve: { virtual_base_reserve: 1000000000000000n, virtual_quote_reserve: 1000000000000n, creator_fee_bps: 0n } } }, state: { busy, sold: 0n }, status, price: 10000000n },
    balances,
    tokens: {
      asset: Asset.native(),
      pair: Asset.native(),
      assetSymbol: 'TOK',
      pairSymbol: 'XLM',
    },
    locked: false,
    setLocked() {},
    refresh: async () => events.push('refresh'),
    });
  };
  const form = render();
  return {
    form,
    render,
    events,
    states,
    storage,
    key,
    writes: () => writes,
    submit: () => form.props.onSubmit({ preventDefault() {} }),
  };
}
for (const side of ['buy', 'sell'])
  test(`${side} persists the server hash immediately after broadcast and confirms independently`, async () => {
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
test('unresolved confirmation preserves the original on-chain hash', async () => {
  const h = harness({ confirmation: 'pending' });
  await h.submit();
  assert.equal(h.writes(), 1);
  assert.equal(h.storage.get(h.key), 'new-hash');
  assert.ok(!h.states.some(value => value?.hash === 'new-hash'), 'Unresolved trades must not open a success dialog');
});
test('recovering an old on-chain hash queues that hash and never buys or sells again', async () => {
  const h = harness({ pending: 'old-hash' });
  await h.submit();
  assert.equal(h.writes(), 0);
  assert.deepEqual(h.events, ['queue:old-hash', 'confirm:old-hash', 'refresh']);
});

function elements(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat().flatMap(elements)];
}

test('All sell uses the lesser of held tokens and eligible curve purchases without losing stroops', () => {
  for (const [held, position] of [[90071992547409930n, 90071992547409931n], [90071992547409931n, 90071992547409930n]]) {
    const h = harness({ side: 'sell', balances: { held, position, pairHeld: 0n } });
    const max = elements(h.form).find(node => node.type === 'Button' && node.props.children === 'All');
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
  assert.deepEqual(h.events, ['connect:/trade/launch-contract?network=testnet']);
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
  assert.equal(dialog.pendingHash, 'new-hash');
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
  assert.equal(dialog.pendingHash, null);
  assert.equal(dialog.error, 'The trade was cancelled in your wallet.');
});

test('unresolved confirmation allows checking the original hash without rebroadcast', async () => {
  const h = harness({ confirmation: 'pending' });
  await h.submit();
  let dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.working, false);
  assert.equal(dialog.pendingHash, 'new-hash');
  assert.equal(dialog.confirmation, undefined);
  dialog.onCheckPending();
  await new Promise(resolve => setImmediate(resolve));
  dialog = tradeDialog(h);
  assert.equal(dialog.open, true);
  assert.equal(dialog.pendingHash, 'new-hash');
  assert.equal(h.writes(), 1);
});

test('dialog supports loading, Blux focus, unresolved confirmation, failure and safe dismissal', () => {
  const jsx = (type, props) => ({ type, props });
  let reduced = false;
  const names = ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter', 'DialogClose'];
  const { TradeResultDialog } = load('trade-result-dialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/components/ui/dialog': Object.fromEntries(names.map(name => [name, name])),
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/spinner': { Spinner: 'Spinner' },
    'motion/react': { motion: { div: 'div', span: 'span', p: 'p' }, AnimatePresence: 'AnimatePresence', useReducedMotion: () => reduced },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/features/launches/trading/trade-transition': { tradeTransition: { duration: 0.24 } },
    './transaction-hash': { TransactionHash: 'TransactionHash' },
  });
  let closed = 0, checks = 0;
  const props = { open: true, side: 'buy', onClose: () => closed++, onCheckPending: () => checks++ };
  const loading = TradeResultDialog({ ...props, working: true, message: 'Checking your wallet' });
  assert.ok(elements(loading).some(node => node.props?.role === 'status' && node.props.children === 'Checking your wallet'));
  assert.ok(!elements(loading).some(node => node.type === 'DialogFooter'), 'Modal uses one surface without a separate footer');
  assert.ok(elements(loading).some(node => node.props?.className?.includes('items-center justify-center')), 'Content stays centered');
  assert.equal(loading.props.modal, true);
  assert.equal(loading.props.disablePointerDismissal, true);
  loading.props.onOpenChange(false);
  assert.equal(closed, 0);
  const approval = TradeResultDialog({ ...props, working: true, awaitingApproval: true });
  assert.equal(approval.props.modal, false);
  const pending = TradeResultDialog({ ...props, pendingHash: 'original-hash', error: 'Still pending' });
  assert.ok(elements(pending).some(node => node.type === 'span' && node.props.children === 'Confirmation pending'));
  elements(pending).find(node => node.type === 'Button' && node.props.children === 'Check submitted trade').props.onClick();
  assert.equal(checks, 1);
  assert.ok(elements(pending).some(node => node.type === 'TransactionHash' && node.props.compact === true));
  assert.ok(elements(pending).some(node => node.type === 'TransactionHash' && node.props.hash === 'original-hash'));
  const failed = TradeResultDialog({ ...props, error: 'Wallet cancelled' });
  assert.ok(elements(failed).some(node => node.props?.role === 'alert' && node.props.children === 'Wallet cancelled'));
  failed.props.onOpenChange(false);
  assert.equal(closed, 1);
  const refreshed = TradeResultDialog({ ...props, confirmation: { hash: 'confirmed-hash', side: 'buy' }, error: 'Refresh failed' });
  assert.ok(elements(refreshed).some(node => node.type === 'span' && node.props.children === 'Buy confirmed'));
  assert.ok(elements(refreshed).some(node => node.props?.role === 'alert' && node.props.children.includes('balances could not refresh')));
  reduced = true;
  const quiet = TradeResultDialog({ ...props, confirmation: { hash: 'confirmed-hash', side: 'buy' } });
  const animated = elements(quiet).filter(node => node.props?.initial !== undefined && node.props.transition);
  assert.ok(animated.length > 0);
  assert.ok(animated.every(node => node.props.initial === false && node.props.transition.duration === 0), 'Reduced motion removes spatial transitions');
});
