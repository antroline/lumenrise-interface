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
  for (const pathname of ['/', '/guide', '/portfolio', '/reputation', '/create', '/dashboard']) {
    const active = items.filter((item) => isActive(pathname, item));
    assert.deepEqual(active.map((item) => item.href), [pathname], pathname);
  }
  assert.ok(isActive('/campaigns', items.find((item) => item.href === '/dashboard')));
});

test('active matching respects path boundaries', () => {
  for (const pathname of ['/launches-other', '/launcher', '/auctioneer']) {
    assert.equal(isActive(pathname, projectBrowseItems[0]), false, pathname);
  }
});
