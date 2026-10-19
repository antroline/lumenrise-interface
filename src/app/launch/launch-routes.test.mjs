import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { StrKey } = require('@stellar/stellar-sdk');
const address = StrKey.encodeContract(Buffer.alloc(32, 1));
const missing = new Error('Not found');
const jsx = (type, props) => ({ type, props });

function route(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': {
      notFound() { throw missing; },
      redirect(href) { throw Object.assign(new Error('Redirect'), { href }); },
    },
    '@stellar/stellar-sdk': { StrKey },
    '@/features/launches/bonding': { BondingCurvePage: 'BondingCurvePage' },
    '@/lib/stellar/network': { API_NETWORK: 'testnet' },
  };
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in mocks, `Unexpected route dependency: ${name}`);
    return mocks[name];
  }, module, module.exports);
  return module.exports.default;
}

const detail = route('./[slug]/page.tsx');
const participate = route('./[slug]/participate/page.tsx');

test('project routes reject non-contract identifiers instead of rendering sample pages', async () => {
  for (const slug of ['removed-project', 'unknown-market', 'invalid-contract']) {
    const props = { params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) };
    await assert.rejects(detail(props), error => error === missing);
    await assert.rejects(participate(props), error => error === missing);
  }
  assert.throws(() => route('../auction/[slug]/page.tsx')(), error => error === missing);
});

test('real project routes preserve contract identity and network selection', async () => {
  for (const [requested, expected] of [[undefined, 'testnet'], ['testnet', 'testnet'], ['public', 'public'], ['mainnet', 'public']]) {
    const tree = await detail({ params: Promise.resolve({ slug: address }), searchParams: Promise.resolve({ network: requested }) });
    assert.equal(tree.type, 'BondingCurvePage');
    assert.equal(tree.props.address, address);
    assert.equal(tree.props.network, expected);
  }
});

test('participation links reach the real trading page and retain query parameters', async () => {
  await assert.rejects(participate({
    params: Promise.resolve({ slug: address }),
    searchParams: Promise.resolve({ network: 'public', tag: ['one', 'two'], unused: undefined }),
  }), error => error.href === `/launch/${address}?network=public&tag=one&tag=two`);
});
