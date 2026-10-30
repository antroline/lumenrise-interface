import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('./base-wallet-button.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(overrides = {}) {
  const state = { ready: true, authenticated: false, walletsReady: true, wallets: [], chainId: 8453, ...overrides };
  const values = [], notifications = [], callbacks = {}, events = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props });
  const sdk = {
    usePrivy: () => ({ ...state, logout: async () => { events.push('logout'); if (state.logoutError) throw new Error('Private provider detail'); } }),
    useWallets: () => ({ wallets: state.wallets, ready: state.walletsReady }),
    useActiveWallet: () => ({ wallet: state.wallets.find(wallet => wallet.address === state.activeAddress), setActiveWallet: wallet => { state.activeAddress = wallet.address; } }),
    useLogin: options => { callbacks.login = options; return { login: () => events.push('login') }; },
    useConnectWallet: options => { callbacks.connect = options; return { connectWallet: () => events.push('connect') }; },
    useCreateWallet: () => ({ createWallet: async () => events.push('create') }),
  };
  const mocks = {
    react: { useState: initial => {
      const key = index++;
      if (!(key in values)) values[key] = initial;
      return [values[key], value => { values[key] = value; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@privy-io/react-auth': sdk,
    wagmi: {
      useConnection: () => ({ address: state.wallets.find(w => w.address === state.activeAddress)?.address ?? state.wallets[0]?.address, connector: { getChainId: async () => state.chainId } }),
      useSwitchChain: () => ({ switchChainAsync: async ({ chainId }) => { await state.wallets[0]?.switchChain?.(chainId); } }),
    },
    '@/components/ui/toast': { useNotify: () => (message, options) => notifications.push({ message, options }) },
    '@/lib/connections': { shortAddress: address => address },
    '@/lib/utils': { cn: (...parts) => parts.filter(Boolean).join(' ') },
    '@/lib/networks/context': { useNetwork: () => ({ activeNetwork: { blockchain: 'base', apiNetwork: state.chainId === 8453 ? 'public' : 'testnet', chainId: state.chainId, label: state.chainId === 8453 ? 'Base Mainnet' : 'Base Sepolia' } }) },
    '@/lib/launchpad': { useLaunchpad: () => ({ account: state.account ?? { status: 'unregistered' }, logout: async () => {
      events.push('logout');
      if (state.logoutError) notifications.push({ message: 'Could not sign out. Please try again.' });
    } }) },
    '@/lib/base/wallet': {
      linkedEvmAddresses: () => state.wallets.map(wallet => wallet.address),
      sameEvmAddress: (a, b) => a.toLowerCase() === b.toLowerCase(),
      selectLinkedWallet: (wallets, _linked, preferred) => wallets.find(wallet => wallet.address === preferred) ?? wallets[0],
      ensureBaseWalletNetwork: (wallet, network) => wallet.switchChain(network === 'public' ? 8453 : 84532),
    },
  };
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports,
    navigator: { clipboard: { writeText: async text => events.push('copy:' + text) } },
    require: name => mocks[name] ?? new Proxy({}, { get: (_, key) => key }),
  });
  function render(props = {}) {
    index = 0;
    const tree = module.exports.BaseWalletButton(props);
    const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
    return { tree, nodes: flatten(tree) };
  }
  return { state, render, callbacks, notifications, events };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Base wallet button follows the registered profile photo and falls back when it is removed', () => {
  const h = harness({ authenticated: true, wallets: [{ address: '0xprimary', chainId: 'eip155:8453', walletClientType: 'metamask' }], account: { status: 'registered', profile: { avatarUrl: '/files/avatar.webp' } } });
  const avatar = compact => h.render({ compact }).nodes.find(node => node.type === 'DropdownMenuTrigger').props.render.props.children.find(node => node?.type === 'ProfileAvatar');
  for (const compact of [false, true]) {
    assert.equal(avatar(compact).props.avatarUrl, '/files/avatar.webp');
    assert.equal(avatar(compact).props.seed, '0xprimary');
  }
  h.state.account = { status: 'registered', profile: { avatarUrl: '/files/updated.webp' } };
  assert.equal(avatar(false).props.avatarUrl, '/files/updated.webp');
  h.state.account = { status: 'registered', profile: { avatarUrl: null } };
  assert.equal(avatar(false).props.avatarUrl, null);
  h.state.account = { status: 'unregistered' };
  assert.equal(avatar(false).props.avatarUrl, null);
});

test('wallet login waits for SDK readiness and uses Privy rather than Stellar', () => {
  const h = harness({ ready: false });
  assert.equal(h.render().tree.props.disabled, true);
  h.state.ready = true;
  const button = h.render().tree;
  assert.equal(button.props.disabled, false);
  button.props.onClick();
  assert.deepEqual(h.events, ['login']);
});

test('restoring a signed-in wallet keeps the control loading until wallets are ready', () => {
  const h = harness({ authenticated: true, walletsReady: false });
  assert.equal(h.render().tree.props.disabled, true);
});

test('dismissing authentication stays quiet while failures show a generic actionable error', () => {
  const h = harness(); h.render();
  h.callbacks.login.onError('exited_auth_flow');
  h.callbacks.connect.onError('exited_auth_flow');
  assert.equal(h.notifications.length, 0);
  h.callbacks.login.onError('authentication_error');
  assert.match(h.notifications[0].message, /try again/);
});

test('wallet network correction targets the selected Base environment without changing the app network', async () => {
  const switches = [];
  const wallet = { address: '0xprimary', chainId: 'eip155:1', walletClientType: 'metamask', switchChain: async id => switches.push(id) };
  const h = harness({ authenticated: true, chainId: 84532, wallets: [wallet] });
  const item = h.render().nodes.find(node => node.type === 'DropdownMenuItem' && String(node.props.children).includes('Switch wallet'));
  item.props.onClick(); await settle();
  assert.deepEqual(switches, [84532]);
});

test('multiple connected wallets can be selected, and a disconnected selection is not retained', () => {
  const wallets = [
    { address: '0xprimary', chainId: 'eip155:8453', walletClientType: 'metamask' },
    { address: '0xsecondary', chainId: 'eip155:8453', walletClientType: 'privy' },
  ];
  const h = harness({ authenticated: true, wallets });
  h.render().nodes.find(node => node.type === 'DropdownMenuRadioGroup').props.onValueChange('0xsecondary');
  assert.equal(h.render().nodes.find(node => node.type === 'DropdownMenuRadioGroup').props.value, '0xsecondary');
  h.state.wallets = [wallets[0]];
  assert.equal(h.render().nodes.find(node => node.type === 'DropdownMenuTrigger').props.render.props['aria-label'], 'Base wallet 0xprimary');
});

test('a signed-in user without a connected wallet can reconnect an external wallet without creating one', () => {
  const h = harness({ authenticated: true });
  const items = h.render().nodes.filter(node => node.type === 'DropdownMenuItem');
  assert.ok(items.some(node => String(node.props.children).includes('Connect existing')));
  assert.ok(!items.some(node => String(node.props.children).includes('Create app wallet')));
});

test('a connected wallet menu has no additional connection or app wallet creation actions', () => {
  const h = harness({ authenticated: true, wallets: [{ address: '0xprimary', chainId: 'eip155:8453', walletClientType: 'metamask' }] });
  const items = h.render().nodes.filter(node => node.type === 'DropdownMenuItem');
  assert.ok(!items.some(node => /Connect another|Connect existing|Create app wallet/.test(String(node.props.children))));
});

test('failed sign-out reports failure without pretending the session ended', async () => {
  const h = harness({ authenticated: true, logoutError: true });
  h.render().nodes.find(node => node.type === 'DropdownMenuItem' && node.props.variant === 'destructive').props.onClick();
  await settle();
  assert.deepEqual(h.events, ['logout']);
  assert.equal(h.notifications[0].message, 'Could not sign out. Please try again.');
  assert.ok(!h.notifications[0].message.includes('Private provider'));
});
