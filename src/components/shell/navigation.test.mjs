import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('./navigation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const navigation = {};
new Function('require', 'exports', compiled)(require, navigation);
const { isActive, navGroups, projectBrowseItems } = navigation;
const items = navGroups.flatMap((group) => group.items);

test('project browsing has one entry; categories belong to the listing', () => {
  assert.equal(projectBrowseItems.length, 1);
  assert.equal(projectBrowseItems[0].href, '/launches');
  assert.ok(items.every((item) => !item.href.includes('?category=')));
});

test('project listing, launch, participation and auction have one active entry', () => {
  for (const pathname of [
    '/launches',
    '/launch/example',
    '/launch/example/participate',
    '/auction/example',
  ]) {
    const active = items.filter((item) => isActive(pathname, item));
    assert.deepEqual(active.map((item) => item.href), ['/launches'], pathname);
  }
});

test('other sections retain a unique active entry', () => {
  for (const pathname of ['/', '/reputation', '/create']) {
    const active = items.filter((item) => isActive(pathname, item));
    assert.deepEqual(active.map((item) => item.href), [pathname], pathname);
  }
});

test('documentation replaces the removed guide in navigation', () => {
  const docs = items.find((item) => item.label === 'Documentation');
  assert.equal(docs?.href, 'https://docs.lumenrise.app');
  assert.ok([...items, ...navigation.searchPages].every((item) => item.href !== '/guide'));
  assert.equal(isActive('/', docs), false);
});

test('unavailable destinations are absent from desktop and mobile navigation', () => {
  for (const pathname of ['/missions', '/portfolio', '/dashboard', '/explorer']) {
    for (const surface of [items, navigation.mobilePrimaryItems, navigation.mobileDrawerItems, navigation.searchPages]) {
      assert.ok(surface.every((item) => item.href !== pathname), pathname);
    }
  }
  assert.ok(navGroups.every((group) => group.items.length > 0));
});

test('mobile primary navigation has exactly the four requested destinations', () => {
  assert.deepEqual(navigation.mobilePrimaryItems.map(({ label, href }) => [label, href]), [
    ['Home', '/'], ['Projects', '/launches'], ['Create', '/create'], ['Reputation', '/reputation'],
  ]);
  assert.deepEqual(navigation.mobileDrawerItems.map(({ label, href }) => [label, href]), items.map(({ label, href }) => [label, href]));
  assert.equal(new Set(navigation.mobileDrawerItems.map(item => item.href)).size, items.length);
  assert.deepEqual(items.map(item => item.href), ['/', 'https://docs.lumenrise.app', '/launches', '/reputation', '/create', '/settings']);
  assert.deepEqual(navigation.searchPages.map(item => item.href), items.map(item => item.href));
});

test('mobile active states follow nested routes and leave secondary destinations unselected', () => {
  for (const [pathname, expected] of [
    ['/', '/'], ['/launches', '/launches'], ['/launch/contract', '/launches'],
    ['/launch/contract/participate', '/launches'], ['/create', '/create'],
    ['/create/review', '/create'], ['/reputation', '/reputation'],
    ['/settings', undefined], ['/documentation', undefined], ['/launcher', undefined],
  ]) {
    assert.deepEqual(navigation.mobilePrimaryItems.filter(item => isActive(pathname, item)).map(item => item.href), expected ? [expected] : [], pathname);
  }
  assert.equal(isActive('/settings', navigation.settingsItem), true);
});

test('discovery navigation preserves supported networks without leaking filters across internal routes', () => {
  const { navigationHref } = navigation;
  for (const href of ['/', '/launches', '/create', '/settings', '/reputation']) {
    assert.equal(navigationHref(href, 'public'), `${href}?network=public`);
    assert.equal(navigationHref(href, 'mainnet'), `${href}?network=public`);
    assert.equal(navigationHref(href, 'testnet'), `${href}?network=testnet`);
    for (const invalid of [null, undefined, '', 'invalid']) assert.equal(navigationHref(href, invalid), href);
  }
  for (const href of ['https://docs.lumenrise.app']) {
    assert.equal(navigationHref(href, 'public'), href);
  }
});

test('active matching respects path boundaries', () => {
  for (const pathname of ['/launches-other', '/launcher', '/auctioneer']) {
    assert.equal(isActive(pathname, projectBrowseItems[0]), false, pathname);
  }
});
