import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(path, imports = require) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: imports });
  return exports;
}
const domain = compile('../../../lib/project-table.ts');
const { MobileProjectList } = compile('./mobile-project-list.tsx', (name) => {
  if (name === 'react/jsx-runtime') return require(name);
  if (name === 'next/link') return ({ children, ...props }) => createElement('a', props, children);
  if (name.endsWith('/project-table')) return domain;
  if (name.endsWith('/token-logo')) return { TokenLogo: ({ name, size }) => createElement('img', { alt: name, width: size, height: size }) };
  return new Proxy({}, { get: () => ({ children }) => createElement('span', null, children) });
});
const graduation = { target: '1K USDC', progressBps: 3600, graduated: false, status: 'Open', stale: false };
const row = (overrides = {}) => ({
  id: 'project', name: 'Long project name', ticker: 'COMP', href: '/launch/contract?network=public',
  category: 'Bonding Curve', phase: 'live', figure: '360 USDC', participants: 3,
  figureContext: '', date: 'Oct 19, 2026', graduation, ...overrides,
});
const render = (rows, props = {}) => renderToStaticMarkup(createElement(MobileProjectList, { rows, ...props }));

test('mobile rows retain identity, asset units, participants and network-aware navigation', () => {
  const html = render([row(), row({ id: 'xlm', figure: '500.01 XLM', participants: 0 })]);
  for (const value of ['360 USDC', '500.01 XLM', '$COMP', '3 participants', '0 participants', '36% Filled', '/launch/contract?network=public', 'width="44"']) {
    assert.ok(html.includes(value), value);
  }
});

test('100% filled does not fabricate graduation and actual graduation wins over stale percentage', () => {
  assert.ok(render([row({ graduation: { ...graduation, progressBps: 10000 } })]).includes('100% Filled'));
  const html = render([row({ graduation: { ...graduation, graduated: true, stale: true } })]);
  assert.ok(html.includes('Graduated'));
  assert.ok(!html.includes('36% Filled'));
  assert.ok(html.includes('may be out of date'));
});

test('progress experiment is off by default and only shows real graduation mechanics', () => {
  assert.ok(!render([row()]).includes('<progress'));
  const html = render([
    row(), row({ id: 'auction', graduation: undefined }),
    row({ id: 'unknown-target', graduation: { ...graduation, status: 'Target unavailable' } }),
  ], { showProgress: true });
  assert.equal((html.match(/<progress/g) ?? []).length, 1);
  assert.ok(html.includes('value="3600"'));
  assert.ok(html.includes('max="10000"'));
});

test('missing data remains unavailable and long metadata is preserved accessibly', () => {
  const name = 'Very long project identity '.repeat(12);
  const html = render([row({ name, participants: null, figure: '—', graduation: undefined })]);
  assert.ok(html.includes('Participants unavailable'));
  assert.ok(html.includes('>—<'));
  assert.ok(html.includes(`title="${name}"`));
  assert.ok(!html.includes('% Filled'));
});
