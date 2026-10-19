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
const profile = { userId: '42', identityId: 'identity-42', addresses: ['owner'] };
const registered = { memberId: 'membership-9', kind: 'registered', identityId: 'identity-42', name: 'Ava', role: 'Developer', avatarUrl: null, xAccount: null };
const external = { ...registered, memberId: 'external-5', kind: 'external', identityId: null, xAccount: 'https://x.com/ava' };
const props = { owner: 'owner', contractId: 'confirmed-contract', network: 'public' };

function load(filename, mocks) {
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(resolve(directory, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, {
    module, exports: module.exports, URL, AbortController, Error, setTimeout, clearTimeout,
    require: (name) => name in mocks ? mocks[name] : require(name),
  });
  return module.exports;
}
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  const children = Array.isArray(node.props?.children) ? node.props.children.flat(Infinity) : [node.props?.children];
  return [node, ...children.flatMap(elements)];
}
function stateHooks() {
  const states = [];
  let cursor = 0;
  return {
    reset: () => { cursor = 0; },
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
      },
      useRef: (initial) => {
        const index = cursor++;
        return states[index] ??= { current: initial };
      },
      useEffect: (effect) => { effect(); },
    },
  };
}
function ownerHarness(account = { status: 'registered', profile }, address = 'owner', members) {
  const hooks = stateHooks(), calls = [], invalidated = [], observers = [];
  let userId = '42', mutationOptions;
  const api = {
    getLaunchTeam: () => {},
    putRegisteredTeamMember: async (...args) => calls.push(['registered', ...args]),
    saveExternalTeamMember: async (...args) => calls.push(['external', ...args]),
    removeTeamMember: async (...args) => calls.push(['remove', ...args]),
    teamErrorMessage: (error) => error.message,
  };
  const exported = load('launch-team.tsx', {
    react: hooks.react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@tanstack/react-query': {
      useQueryClient: () => ({ invalidateQueries: async (input) => invalidated.push(input) }),
      useQuery: (options) => { observers.push(options); return { data: [registered, external], isPending: false }; },
      useMutation: (options) => {
        mutationOptions = options;
        return { reset() {}, mutate() {}, mutateAsync: async (change) => { await options.mutationFn(change); await options.onSuccess(); } };
      },
    },
    'lucide-react': { Pencil: 'Pencil', Plus: 'Plus', Trash2: 'Trash2' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/app-dialog': Object.fromEntries(['AppDialogContent', 'AppDialogHeader', 'AppDialogFooter'].map(name => [name, name])),
    '@/components/ui/dialog': { Dialog: 'Dialog' },
    '@/components/ui/skeleton': { Skeleton: 'Skeleton' },
    '@/lib/api/client': { getApiUserId: () => userId },
    '@/lib/api/launches/team': api,
    '@/lib/launchpad': { useLaunchpad: () => ({ address, account }) },
    './launch-team-member-dialog': { LaunchTeamMemberDialog: 'MemberDialog', MemberAvatar: 'MemberAvatar' },
  });
  const root = exported.LaunchTeam({ ...props, members });
  function render() { hooks.reset(); return typeof root?.type === 'function' ? root.type(root.props) : root; }
  return { root, render, calls, invalidated, observers,
    mutation: () => mutationOptions, changeUser: (id) => { userId = id; } };
}

test('team controls never mount or request private data for visitors, preview, or another wallet', () => {
  for (const [account, address] of [[{ status: 'signed-out' }, undefined], [{ status: 'preview' }, 'owner'], [{ status: 'checking' }, 'owner'], [{ status: 'registered', profile }, 'another-wallet']]) {
    const h = ownerHarness(account, address);
    assert.equal(h.root, null);
    assert.equal(h.observers.length, 0);
    assert.equal(h.calls.length, 0);
  }
});

test('owner sees an obvious add action; members are keyed by memberId and query scope includes account and network', () => {
  const h = ownerHarness();
  const nodes = elements(h.render());
  assert.ok(nodes.some((node) => node.type === 'Button' && node.props.children?.includes?.('Add Team Member')));
  assert.deepEqual(nodes.filter((node) => node.type === 'li').map((node) => node.key), ['membership-9', 'external-5']);
  assert.equal(JSON.stringify(h.observers[0].queryKey), JSON.stringify(['launch-team', 'public', 'confirmed-contract', '42']));
  assert.ok(!nodes.some((node) => node.type === 'a' && node.props.href === null));
});

test('visitors see public team profiles without private requests or editing controls', () => {
  const h = ownerHarness({ status: 'signed-out' }, undefined, [{ ...registered, avatarUrl: '/profile.webp' }, external]);
  const nodes = elements(h.render());
  assert.deepEqual(nodes.filter((node) => node.type === 'li').map((node) => node.key), ['membership-9', 'external-5']);
  const identities = nodes.filter((node) => typeof node.type === 'function');
  assert.equal(identities[0].props.member.name, 'Ava');
  const details = identities.flatMap((node) => elements(node.type(node.props)));
  assert.equal(details.find((node) => node.type === 'MemberAvatar').props.identityId, registered.identityId);
  assert.equal(details.find((node) => node.type === 'MemberAvatar').props.avatarUrl, '/profile.webp');
  assert.ok(!nodes.some((node) => node.type === 'Button' || node.type === 'MemberDialog'));
  assert.equal(h.observers.length, 0);
  assert.equal(h.calls.length, 0);
});

test('saving registered roles preserves identityId and refreshes the scoped list', async () => {
  const h = ownerHarness();
  let nodes = elements(h.render());
  nodes.find((node) => node.props?.['aria-label'] === 'Edit Ava').props.onClick();
  nodes = elements(h.render());
  const dialog = nodes.find((node) => node.type === 'MemberDialog');
  assert.equal(dialog.props.member.memberId, registered.memberId);
  await dialog.props.onSave({ kind: 'registered', identityId: registered.identityId, role: 'Designer' });
  assert.equal(h.calls[0][0], 'registered');
  assert.equal(h.calls[0][2], registered.identityId);
  assert.equal(h.calls[0][3], 'Designer');
  assert.equal(h.calls[0][4].network, 'public');
  assert.equal(h.invalidated.length, 2);
  assert.equal(JSON.stringify(h.invalidated[1].queryKey), JSON.stringify(['launch', 'public', 'confirmed-contract', 'detail']));
  assert.equal(elements(h.render()).some((node) => node.type === 'MemberDialog'), false);
});

test('all mutation types use the selected network and are blocked after the account changes', async () => {
  const h = ownerHarness();
  h.render();
  await h.mutation().mutationFn({ kind: 'external', memberId: external.memberId, input: { name: 'Ava', role: 'Developer', xAccount: external.xAccount } });
  assert.equal(h.calls[0][2].name, 'Ava');
  assert.equal(h.calls[0][3].network, 'public');
  assert.equal(h.calls[0][4], external.memberId);
  await h.mutation().mutationFn({ kind: 'remove', member: registered });
  assert.equal(h.calls[1][2].identityId, registered.identityId);
  h.changeUser('another-user');
  await assert.rejects(() => h.mutation().mutationFn({ kind: 'remove', member: external }), /account changed/);
  assert.equal(h.calls.length, 2);
});

function formHarness(member = null) {
  const hooks = stateHooks(), saved = [];
  const ui = (names) => Object.fromEntries(names.map((name) => [name, name]));
  const exported = load('launch-team-member-dialog.tsx', {
    react: { ...hooks.react, useEffect() {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@tanstack/react-query': { useQuery: () => ({ data: [registered], isFetching: false }) },
    'lucide-react': ui(['Check', 'LoaderCircle', 'Search']),
    '@/components/profile-avatar': ui(['ProfileAvatar']),
    '@/components/ui/button': ui(['Button']),
    '@/components/app-dialog': Object.fromEntries(['AppDialogContent', 'AppDialogHeader', 'AppDialogFooter'].map(name => [name, name])),
    '@/components/ui/dialog': ui(['DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle']),
    '@/components/ui/field': ui(['Field', 'FieldDescription', 'FieldGroup', 'FieldLabel']),
    '@/components/ui/input': ui(['Input']),
    '@/components/ui/toggle-group': ui(['ToggleGroup', 'ToggleGroupItem']),
    '@/lib/api/client': { resolveApiFileUrl: (value) => value },
    '@/lib/api/launches/team': { searchTeamCandidates() {}, teamErrorMessage: (error) => error.message },
  });
  function render() {
    hooks.reset();
    return exported.LaunchTeamMemberDialog({ contractId: 'confirmed-contract', network: 'public', sessionId: '42', member, busy: false, onSave: async (change) => saved.push(change), onCancel() {} });
  }
  return { render, saved, MemberAvatar: exported.MemberAvatar };
}

test('member avatars use profile photos with stable generated identities instead of initials', () => {
  const { MemberAvatar } = formHarness();
  for (const member of [registered, external, { ...registered, avatarUrl: '/profile.webp' }]) {
    const avatar = MemberAvatar(member);
    assert.equal(avatar.type, 'ProfileAvatar');
    assert.equal(avatar.props.avatarUrl, member.avatarUrl);
    assert.equal(avatar.props.seed, member.identityId || member.memberId);
  }
});

test('registered editing keeps profile fields read-only and allows a missing X connection', async () => {
  const h = formHarness(registered);
  let nodes = elements(h.render());
  assert.deepEqual(nodes.filter((node) => node.type === 'Input').map((node) => node.props.id), ['team-role']);
  nodes.find((node) => node.props?.id === 'team-role').props.onChange({ target: { value: 'Designer' } });
  nodes = elements(h.render());
  await nodes.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(JSON.stringify(h.saved[0]), JSON.stringify({ kind: 'registered', identityId: registered.identityId, role: 'Designer' }));
});

test('external editing without a replacement image submits the existing required values and memberId', async () => {
  const h = formHarness(external);
  const nodes = elements(h.render());
  assert.equal(nodes.find((node) => node.props?.id === 'team-image').props.required, false);
  for (const id of ['team-name', 'team-x', 'team-role'])
    assert.equal(nodes.find((node) => node.props?.id === id).props.required, true);
  await nodes.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved[0].memberId, external.memberId);
  assert.equal(h.saved[0].input.image, undefined);
  assert.equal(h.saved[0].input.xAccount, external.xAccount);
});

test('adding an external member preserves typed fields and the chosen photo across member-type switches', async () => {
  const h = formHarness();
  let nodes = elements(h.render());
  nodes.find((node) => node.type === 'ToggleGroup').props.onValueChange(['external']);
  nodes = elements(h.render());
  const image = new File(['photo'], 'avatar.webp', { type: 'image/webp' });
  for (const [id, value] of [['team-name', 'Ava'], ['team-role', 'Developer'], ['team-x', 'https://x.com/ava']])
    nodes.find((node) => node.props?.id === id).props.onChange({ target: { value } });
  nodes.find((node) => node.props?.id === 'team-image').props.onChange({ target: { files: [image] } });
  nodes.find((node) => node.type === 'ToggleGroup').props.onValueChange(['registered']);
  nodes = elements(h.render());
  nodes.find((node) => node.type === 'ToggleGroup').props.onValueChange(['external']);
  nodes = elements(h.render());
  assert.equal(nodes.find((node) => node.props?.id === 'team-image').props.required, false);
  await nodes.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved[0].kind, 'external');
  assert.equal(h.saved[0].input.name, 'Ava');
  assert.equal(h.saved[0].input.role, 'Developer');
  assert.equal(h.saved[0].input.image, image);
});
