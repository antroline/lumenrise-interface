import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { apiContextModule, configurationModule, networkModule } from '../../configuration-fixture.mjs';

const require = createRequire(import.meta.url);
const jsx = (type, props) => ({ type, props });
const ui = (...names) => Object.fromEntries(names.map(name => [name, name]));
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
}
function harness({ name = 'Alice', avatarUrl = '/old.webp', save, remove } = {}) {
  let cursor = 0;
  const slots = [], calls = [], removed = [];
  const props = { name, avatarUrl, seed: 'owner' };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect() {},
  };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'Link' }, 'lucide-react': ui('Camera', 'LogOut', 'Trash2', 'Undo2', 'Wallet'),
    '@/components/auth-gate': ui('AuthGate'), '@/components/page-header': ui('PageHeader'),
    '@/components/profile-avatar': ui('ProfileAvatar'), '@/components/image-crop-input': ui('ImageCropInput'),
    '@/components/ui/badge': ui('Badge'), '@/components/ui/button': ui('Button'),
    '@/components/ui/card': ui('Card', 'CardDescription', 'CardHeader', 'CardTitle'),
    '@/components/ui/field': ui('Field', 'FieldDescription', 'FieldError', 'FieldLabel'), '@/components/form-controls': { FieldSurface: 'FieldSurface', FormInput: 'Input' },
    '@/lib/api/client': apiContextModule,
    '@/lib/api/config': configurationModule, '@/lib/stellar/network': networkModule,
    '@/lib/client-rules': { imageHint: () => 'Supported image formats' }, '@/lib/connections': { shortAddress: value => value },
    '@/features/launches/components/team-invitations': ui('TeamInvitations'),
    '@/lib/launchpad': { useLaunchpad: () => ({
      account: { status: 'registered', profile: { ...props, identityId: 'idn_1' } }, refreshProfile() {},
      async updateProfile(input) {
        calls.push(input);
        const result = save ? await save(input) : { ok: true };
        if (result.ok) { props.name = input.name ?? props.name; props.avatarUrl = input.avatar ? '/new.webp' : props.avatarUrl; }
        return result;
      },
      async removeAvatar() {
        removed.push(true);
        const result = remove ? await remove() : { ok: true };
        if (result.ok) props.avatarUrl = null;
        return result;
      },
    }) },
  };
  const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8') + '\nexport { ProfileCard, SettingsContent };';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, URL, require: name => name in mocks ? mocks[name] : require(name) });
  let tree;
  const render = () => { cursor = 0; tree = module.exports.ProfileCard(props); return tree; };
  const find = type => elements(tree).find(node => node.type === type);
  const button = label => elements(tree).find(node => node.type === 'Button' && [node.props.children].flat().filter(child => typeof child === 'string').join('') === label);
  const changeName = value => { find('Input').props.onChange({ target: { value } }); render(); };
  const crop = file => { find('ImageCropInput').props.onCropped(file); render(); };
  const submit = () => find('form').props.onSubmit({ preventDefault() {} });
  render();
  return { render, find, button, changeName, crop, submit, calls, removed, props, settings: () => module.exports.SettingsContent({ address: 'owner', logout() {} }), elements };
}

test('profile starts with the current name and Save stays disabled for unchanged or invalid names', async () => {
  const h = harness();
  assert.equal(h.find('Input').props.value, 'Alice');
  assert.equal(h.button('Save changes').props.disabled, true);
  h.changeName('  Alice  ');
  assert.equal(h.button('Save changes').props.disabled, true);
  for (const value of ['   ', 'A'.repeat(81)]) {
    h.changeName(value);
    assert.equal(h.find('Input').props['aria-invalid'], true);
    assert.ok(h.find('FieldError').props.children);
    await h.submit();
  }
  assert.equal(h.calls.length, 0);
});

test('name-only and avatar-only edits send only the changed field; cropping waits for Save', async () => {
  const name = harness();
  name.changeName('  Updated name  ');
  await name.submit(); name.render();
  assert.deepEqual(Object.keys(name.calls[0]), ['name']);
  assert.equal(name.calls[0].name, 'Updated name');
  assert.equal(name.find('Input').props.value, 'Updated name');
  assert.equal(name.button('Save changes').props.disabled, true);
  const avatar = harness();
  const file = new File(['photo'], 'photo.png', { type: 'image/png' });
  avatar.crop(file);
  assert.equal(avatar.calls.length, 0);
  await avatar.submit(); avatar.render();
  assert.deepEqual(Object.keys(avatar.calls[0]), ['avatar']);
  assert.equal(avatar.calls[0].avatar, file);
  assert.equal(avatar.button('Save changes').props.disabled, true);
});

test('combined edits make one request and block duplicate saves while pending', async () => {
  let resolve;
  const h = harness({ save: () => new Promise(done => { resolve = done; }) });
  h.changeName('New name');
  h.crop(new File(['photo'], 'photo.png', { type: 'image/png' }));
  const saving = h.submit(); h.render();
  assert.equal(h.button('Saving…').props.disabled, true);
  assert.equal(h.button('Discard changes').props.disabled, true);
  assert.equal(h.find('Input').props.disabled, true);
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(Object.keys(h.calls[0]).sort(), ['avatar', 'name']);
  resolve({ ok: true }); await saving; h.render();
  assert.equal(h.button('Save changes').props.disabled, true);
});

test('API errors keep the unsaved name and cropped photo available for retry', async () => {
  let fail = true;
  const h = harness({ save: async () => fail ? { ok: false, error: 'Name is unavailable.' } : { ok: true } });
  const file = new File(['photo'], 'photo.png', { type: 'image/png' });
  h.changeName('New name'); h.crop(file);
  await h.submit(); h.render();
  assert.equal(h.find('Input').props.value, 'New name');
  assert.ok(h.elements(h.render()).some(node => node.props?.role === 'alert' && node.props.children === 'Name is unavailable.'));
  assert.ok(h.find('img'));
  assert.equal(h.button('Save changes').props.disabled, false);
  fail = false; await h.submit();
  assert.equal(h.calls[1].name, 'New name');
  assert.equal(h.calls[1].avatar, file);
});

test('photo removal keeps unsaved name edits and uses the separate deletion action', async () => {
  const h = harness(); h.changeName('Unsaved name');
  await h.button('Remove photo').props.onClick();
  h.render();
  assert.equal(h.removed.length, 1);
  assert.equal(h.calls.length, 0);
  assert.equal(h.props.avatarUrl, null);
  assert.equal(h.find('Input').props.value, 'Unsaved name');
  assert.equal(h.button('Save changes').props.disabled, false);
});

test('background profile refresh does not overwrite a dirty name and unavailable settings are absent', () => {
  const h = harness(); h.changeName('Unsaved name');
  h.props.name = 'Refreshed name'; h.render();
  assert.equal(h.find('Input').props.value, 'Unsaved name');
  const cards = h.elements(h.settings()).filter(node => typeof node.type === 'function' && node.type.name === 'SettingsCard');
  assert.deepEqual(cards.map(node => node.props.id), ['team-invitations', 'wallets', 'security']);
});


test('discarding profile edits restores the current name and photo without making a request', () => {
  const h = harness();
  h.changeName('Unsaved name');
  h.crop(new File(['photo'], 'photo.png', { type: 'image/png' }));
  h.button('Discard changes').props.onClick(); h.render();
  assert.equal(h.find('Input').props.value, 'Alice');
  assert.equal(h.find('img'), undefined);
  assert.equal(h.button('Save changes').props.disabled, true);
  assert.equal(h.calls.length, 0);
});
