import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const tag = (name) => ({ children, ...props }) => {
  const { size: _size, variant: _variant, directory: _directory, tone: _tone, ...attributes } = props;
  return createElement(name, attributes, children);
};
const columns = ['name', 'category', 'phase', 'figure', 'participants', 'date']
  .map((key) => ({ key, label: key }));
const exports = {};
const domain = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/project-table.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: domain });
runInNewContext(
  ts.transpileModule(readFileSync(new URL('./projects-table.tsx', import.meta.url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText,
  {
    exports,
    require: (name) => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'next/link') return tag('a');
      if (name.endsWith('/results-transition')) return { ResultsLink: tag('a') };
      if (name.endsWith('/project-table')) return { ...domain, projectColumns: columns };
      if (name.endsWith('/utils')) return { cn: (...values) => values.filter(Boolean).join(' ') };
      if (name.endsWith('/ui/table')) return Object.fromEntries(
        Object.entries({ Table: 'table', TableBody: 'tbody', TableCell: 'td', TableHead: 'th', TableHeader: 'thead', TableRow: 'tr' })
          .map(([key, value]) => [key, tag(value)]),
      );
      return new Proxy({}, { get: () => tag('span') });
    },
  },
);
const row = (graduation, overrides = {}) => ({
  id: 'project', name: 'Long project name', ticker: 'TOK', category: 'Bonding Curve',
  phase: 'live', figure: '0 USDC', figureContext: '', participants: 0,
  date: 'Oct 19, 2026', dateLabel: 'opens · UTC', graduation, ...overrides,
});
const graduation = { target: '1K USDC', progressBps: 0, graduated: false, stale: false, status: 'Open' };
const render = (rows) => renderToStaticMarkup(createElement(exports.ProjectsTable, {
  directory: true, rows, caption: 'Directory', figureLabel: 'Pool balance',
}));

test('graduation displays zero, partial and 100% filled without inferring graduation', () => {
  for (const [progressBps, expected] of [[0, '0% Filled'], [3600, '36% Filled'], [10000, '100% Filled']]) {
    const html = render([row({ ...graduation, progressBps })]);
    assert.ok(html.includes(expected));
    assert.ok(!html.includes('>Graduated<'));
    assert.ok(html.includes('1K USDC'));
  }
});

test('actual graduation flag takes precedence over percentage and stale snapshot stays explicit', () => {
  const html = render([row({ ...graduation, graduated: true, stale: true, progressBps: 3600 })]);
  assert.ok(html.includes('>Graduated<'));
  assert.ok(!html.includes('% Filled'));
  assert.ok(html.includes('may be out of date'));
});

test('existing table consumers can supply actual graduated status through the row phase', () => {
  const { graduated: _graduated, ...legacyGraduation } = graduation;
  assert.ok(render([row(legacyGraduation, { phase: 'launched' })]).includes('>Graduated<'));
  assert.ok(render([row({ ...graduation, progressBps: 10000 })]).includes('100% Filled'));
});

test('missing graduation and participants stay unavailable while real zeros remain visible', () => {
  const html = render([row(undefined, { participants: null }), row(graduation, { id: 'zero' })]);
  assert.ok(html.includes('—'));
  assert.ok(html.includes('>0</td>'));
  assert.ok(html.includes('0 USDC'));
});

test('external links are separate from the project link and include safe new-tab semantics', () => {
  const html = render([row(graduation, {
    href: '/launch/contract?network=public',
    website: 'https://example.com',
    xAccount: 'https://x.com/project',
  })]);
  assert.ok(html.includes('/launch/contract?network=public'));
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.ok(html.includes('opens in new tab'));
});
