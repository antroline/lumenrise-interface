import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('./app-shell.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(pathname, blockchain, requestedNetworkId) {
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/networks/context': { useNetwork: () => ({ activeNetwork: { blockchain }, requestedNetworkId }) },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  };
  runInNewContext(source, {
    module, exports: module.exports, process: { env: { NODE_ENV: 'development' } },
    require: name => mocks[name] ?? new Proxy({}, { get: (_, key) => key }),
  });
  const tree = module.exports.AppShell({ children: 'STELLAR_CONTENT' });
  const flatten = node => !node || typeof node !== 'object' ? [node] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  return flatten(tree);
}

for (const route of ['/', '/projects', '/projects/TOKEN', '/create', '/portfolio', '/settings', '/register', '/onboarding', '/design-lab']) {
  test(`Base reuses shared route content: ${route}`, () => {
    const nodes = render(route, 'base');
    assert.ok(!nodes.some(node => node?.type === 'BaseUnavailable'));
    assert.ok(nodes.includes('STELLAR_CONTENT'));
  });
}

for (const route of ['/reputation', '/missions', '/developers', '/cli', '/policies']) {
  test(`Base does not mount unsupported feature content: ${route}`, () => {
    const nodes = render(route, 'base');
    assert.ok(nodes.some(node => node?.type === 'BaseUnavailable'));
    assert.ok(!nodes.includes('STELLAR_CONTENT'));
  });
}

test('Stellar retains existing route content and focused creation layout', () => {
  assert.ok(render('/projects', 'stellar').includes('STELLAR_CONTENT'));
  assert.ok(render('/create', 'stellar').some(node => node?.type === 'FocusedShell'));
});

test('project network mismatches render a recovery state instead of route content', () => {
  for (const blockchain of ['base', 'stellar']) {
    const nodes = render('/projects/TOKEN', blockchain, blockchain === 'base' ? 'stellar-mainnet' : 'base-mainnet');
    assert.ok(nodes.some(node => node?.type === 'NetworkMismatch'));
    assert.ok(!nodes.includes('STELLAR_CONTENT'));
    assert.ok(!nodes.some(node => node?.type === 'BaseUnavailable'));
  }
});
