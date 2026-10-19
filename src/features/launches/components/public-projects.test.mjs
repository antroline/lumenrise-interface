import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(path, imports) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: imports, URL, URLSearchParams });
  return exports;
}
const directory = compile('../lib/directory.ts', () => ({}));
const status = (data, extra = {}) => ({
  data, isPending: false, isError: false, error: null, refetch: () => {}, ...extra,
});
function render(catalog, { props = {}, page = status(), metrics = status() } = {}) {
  const queries = [catalog, page, metrics], options = [];
  const element = ({ children }) => createElement('div', null, children);
  const exports = compile('./public-projects.tsx', (name) => {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return ({ children, href }) => createElement('a', { href }, children);
    if (name === 'next/navigation') return { useRouter: () => ({ push() {}, replace() {} }) };
    if (name === '@tanstack/react-query') return {
      useQuery: (option) => { options.push(option); return queries.shift(); },
      useQueryClient: () => ({ cancelQueries() {} }),
    };
    if (name.endsWith('/directory')) return directory;
    if (name.endsWith('/directory-data')) return { DIRECTORY_PAGE_SIZE: 20, DIRECTORY_MAX_MARKETS: 40 };
    if (name.endsWith('/queries')) return { publicQueryOptions: {}, usePageVisible: () => true };
    if (name.endsWith('/project-table')) return { projectColumns: [] };
    if (name.endsWith('/utils')) return { cn: (...values) => values.filter(Boolean).join(' ') };
    if (name.endsWith('/projects-table')) return {
      ProjectsTableSkeleton: () => createElement('div', { 'data-loading': true }),
      ProjectsTable: ({ rows }) => createElement('div', { 'data-count': rows.length }),
    };
    return new Proxy({}, { get: () => element });
  });
  const html = renderToStaticMarkup(createElement(exports.PublicProjects, {
    network: 'testnet', page: 1, ...props,
  }));
  return { html, options };
}

test('initial directory loading renders a busy skeleton rather than an empty list', () => {
  const { html } = render(status(undefined, { isPending: true }));
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(html.includes('data-loading="true"'));
  assert.ok(!html.includes('No launches yet'));
});

test('directory failure has an actionable error and retry instead of fake empty success', () => {
  const { html } = render(status(undefined, { isError: true, error: new Error('Offline') }));
  assert.ok(html.includes('Could not load launches'));
  assert.ok(html.includes('Offline'));
  assert.ok(html.includes('Retry'));
  assert.ok(!html.includes('No launches yet'));
});

test('successful empty directory remains distinct from loading and failure', () => {
  const { html } = render(status({ complete: true, launches: [], total: 0 }));
  assert.ok(html.includes('No launches yet'));
  assert.ok(html.includes('0 shown'));
  assert.ok(!html.includes('Could not load'));
});

test('failed activity reads do not render a falsely ranked table', () => {
  const launch = { contractId: 'a', pair: 'USDC', metadata: { name: 'A', symbol: 'A' }, bonding: null };
  const { html, options } = render(status({ complete: true, launches: [launch], total: 1 }), {
    props: { sort: 'trending', search: 'no-match' },
    metrics: status(undefined, { isError: true, error: new Error('Metrics offline') }),
  });
  assert.ok(html.includes('Could not load recent rankings'));
  assert.ok(html.includes('Metrics offline'));
  assert.ok(!html.includes('data-count'));
  assert.equal(options[2].enabled, true);
  assert.equal(options[2].retry, false);
});

test('larger directories disclose page-local scope and do not enable expensive market reads', () => {
  const { html, options } = render(status({ complete: false, launches: [], total: 250 }));
  assert.ok(html.includes('apply to this page only'));
  assert.ok(html.includes('Recent rankings are unavailable'));
  assert.equal(options[2].enabled, false);
});
