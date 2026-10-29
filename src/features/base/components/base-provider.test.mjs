import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('./base-provider.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(appId, blockchain = 'base', activeAddress) {
  const calls = [], module = { exports: {} };
  const states = [];
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useCallback: callback => callback, useState: initialize => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initialize();
      return [states[index]];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@privy-io/react-auth': { PrivyProvider: 'PrivyProvider', useActiveWallet: () => ({ wallet: activeAddress ? { address: activeAddress } : undefined }) },
    wagmi: { WagmiProvider: 'PublicWagmiProvider' },
    '@privy-io/wagmi': { WagmiProvider: 'WagmiProvider' },
    '@tanstack/react-query': { QueryClient: class QueryClient {}, QueryClientProvider: 'QueryClientProvider' },
    '@/hooks/use-dark-theme': { useDarkTheme: () => true },
    '@/lib/base/privy-config': { createPrivyConfig: (network, dark) => { calls.push({ network, dark }); return { configured: true }; } },
    '@/lib/base/wagmi-config': { createBaseWagmiConfig: network => ({ chainId: network.chainId }) },
    '@/lib/networks/context': { useNetwork: () => ({ activeNetwork: { blockchain, chainId: 84532 }, switchBlockchain() {} }) },
    '@/components/network-notice': { NetworkNotice: 'NetworkNotice' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/toast': { ToastProvider: 'ToastProvider' },
    '@/lib/configuration': { useConfiguration: () => ({ auth: { appId } }) },
    './base-account-provider': { BaseAccountProvider: 'BaseAccountProvider', BasePublicAccountProvider: 'BasePublicAccountProvider' },
    '@/lib/base/wallet': {
      linkedEvmAddresses: accounts => accounts.map(account => account.address),
      selectLinkedWallet: (wallets, linked, preferred) => wallets.find(wallet => wallet.address === preferred && linked.includes(wallet.address)) ?? wallets.find(wallet => linked.includes(wallet.address)),
    },
  };
  runInNewContext(code, { module, exports: module.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; } });
  return {
    tree: module.exports.default({ appId, children: 'CONTENT' }), calls,
    renderWeb3(element) {
      stateIndex = 0;
      return element.type(element.props);
    },
  };
}

test('Base mounts Privy with only its App ID and wraps content in shared notifications', () => {
  const { tree, calls } = render('test-app-id');
  assert.equal(tree.type, 'PrivyProvider');
  assert.equal(tree.props.appId, 'test-app-id');
  assert.equal('appSecret' in tree.props, false);
  assert.equal(tree.props.children.props.children.type, 'ToastProvider');
  assert.equal(tree.props.children.props.children.props.children.type, 'BaseAccountProvider');
  assert.equal(tree.props.children.props.children.props.children.props.children, 'CONTENT');
  assert.equal(calls[0].network.chainId, 84532);
  assert.equal(calls[0].dark, true);
});

test('Base nests the Privy Wagmi adapter inside its own query client for the selected chain', () => {
  const h = render('test-app-id');
  const web3 = h.renderWeb3(h.tree.props.children);
  assert.equal(web3.type, 'QueryClientProvider');
  assert.equal(web3.props.children.type, 'WagmiProvider');
  assert.equal(web3.props.children.props.config.chainId, 84532);
  assert.equal(web3.props.children.props.children.type, 'ToastProvider');
  const rerender = h.renderWeb3(h.tree.props.children);
  assert.equal(rerender.props.client, web3.props.client);
  assert.equal(rerender.props.children.props.config, web3.props.children.props.config);
});

test('wagmi uses the wallet selected in the existing Privy menu and drops disconnected selections', () => {
  const h = render('test-app-id', 'base', '0xselected');
  const select = h.renderWeb3(h.tree.props.children).props.children.props.setActiveWalletForWagmi;
  const primary = { address: '0xprimary' }, selected = { address: '0xselected' };
  assert.equal(select({ wallets: [primary, selected], user: { linkedAccounts: [primary, selected] } }), selected);
  assert.equal(select({ wallets: [primary], user: { linkedAccounts: [primary] } }), primary);
  assert.equal(select({ wallets: [primary], user: null }), undefined);
  assert.equal(select({ wallets: [], user: null }), undefined);
});

test('missing App ID keeps public shared pages usable without mounting Privy', () => {
  const h = render('  ');
  const { tree, calls } = h;
  const publicTree = h.renderWeb3(tree);
  assert.equal(publicTree.type, 'PublicWagmiProvider');
  assert.equal(publicTree.props.children.type, 'QueryClientProvider');
  assert.equal(publicTree.props.children.props.children.type, 'ToastProvider');
  assert.equal(publicTree.props.children.props.children.props.children.type, 'BasePublicAccountProvider');
  assert.equal(calls.length, 0);
});

test('a Stellar network cannot mount the Base provider', () => {
  assert.throws(() => render('test-app-id', 'stellar'), /requires a Base/);
});
