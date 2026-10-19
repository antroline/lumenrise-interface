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
const jsx = (type, props, key) => ({ type, props, key });
const ui = (...names) => Object.fromEntries(names.map((name) => [name, name]));
function load(filename, mocks) {
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(resolve(directory, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports,
    require: (name) => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name in mocks ? mocks[name] : require(name),
  });
  return module.exports;
}
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  const children = [node.props?.children, node.props?.render].flat(Infinity);
  return [node, ...children.flatMap(elements)];
}

test('profile avatars resolve uploaded URLs and keep generated fallback for missing or failed images', () => {
  const { ProfileAvatar } = load('profile-avatar.tsx', {
    '@/components/blockie': ui('Blockie'),
    '@/components/ui/avatar': ui('Avatar', 'AvatarImage', 'AvatarFallback'),
    '@/lib/api/client': { resolveApiFileUrl: (url) => url ? `https://api.example${url}` : null },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  });
  for (const avatarUrl of ['/photo.webp', null, '']) {
    const root = ProfileAvatar({ seed: 'wallet', avatarUrl, size: 24, radius: 6 });
    const nodes = elements(root);
    const image = nodes.find((node) => node.type === 'AvatarImage');
    assert.equal(image?.props.src, avatarUrl ? 'https://api.example/photo.webp' : undefined);
    assert.equal(root.props.style.width, 24);
    assert.equal(root.props.style.borderRadius, 6);
    const fallback = nodes.find((node) => node.type === 'AvatarFallback');
    assert.equal(fallback.props.children.type, 'Blockie');
    assert.equal(fallback.props.children.props.seed, 'wallet');
  }
});

test('both wallet avatars use the current account photo and update when it is removed or changed', () => {
  let avatarUrl = '/first.webp';
  const { WalletButton } = load('shell/wallet-button.tsx', {
    'next/link': { default: 'Link' },
    'lucide-react': ui('ChevronDown', 'Copy', 'LogOut', 'Settings', 'UserRound', 'Wallet'),
    '@/components/profile-avatar': ui('ProfileAvatar'),
    '@/components/ui/button': ui('Button'),
    '@/components/ui/dropdown-menu': ui('DropdownMenu', 'DropdownMenuContent', 'DropdownMenuGroup', 'DropdownMenuItem', 'DropdownMenuLabel', 'DropdownMenuRadioGroup', 'DropdownMenuRadioItem', 'DropdownMenuSeparator', 'DropdownMenuTrigger'),
    '@/lib/connections': { shortAddress: (address) => address },
    '@/lib/launchpad': { useLaunchpad: () => ({ isSignedIn: true, address: 'wallet', account: { status: 'registered', profile: { name: 'Ava', avatarUrl } } }) },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@bluxcc/react': { useBlux: () => ({ profile() {} }) },
    './navigation': { settingsItem: { href: '/settings' } },
  });
  for (const photo of ['/first.webp', null, '/replacement.webp']) {
    avatarUrl = photo;
    const avatars = elements(WalletButton({})).filter((node) => node.type === 'ProfileAvatar');
    assert.equal(avatars.length, 2);
    assert.ok(avatars.every((node) => node.props.avatarUrl === photo && node.props.seed === 'wallet'));
  }
});

test('creator uses the published photo and name, keeping the deploying wallet as fallback identity', () => {
  const { LaunchCreator } = load('../features/launches/components/launch-creator.tsx', {
    '../trading/trade-tooltip': ui('TradeTooltipText'),
    '@/components/profile-avatar': ui('ProfileAvatar'),
    './launch-project-links': ui('CopyAddress', 'ExplorerLink'),
  });
  const owner = 'GDEPLOYINGWALLET';
  for (const profile of [{ name: 'Ava', avatarUrl: '/ava.webp' }, undefined]) {
    const nodes = elements(LaunchCreator({ owner, network: 'public', profile }));
    const avatar = nodes.find((node) => node.type === 'ProfileAvatar');
    assert.equal(avatar.props.avatarUrl, profile?.avatarUrl);
    assert.equal(avatar.props.seed, owner);
    assert.equal(nodes.find((node) => node.type === 'h3').props.children.props.children, profile?.name || `${owner.slice(0, 6)}…${owner.slice(-6)}`);
    assert.equal(nodes.find((node) => node.type === 'CopyAddress').props.address, owner);
  }
});
