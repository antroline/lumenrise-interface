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
    '@/lib/launch-slug': { isLaunchSlug: value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !['team', 'prelaunch'].includes(value) && value.length <= 100 },
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

test('project routes reject invalid slugs and contract addresses instead of rendering sample pages', async () => {
  for (const slug of [address, 'team', 'prelaunch', 'Bad Name', 'a'.repeat(101)]) {
    const props = { params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) };
    await assert.rejects(detail(props), error => error === missing);
    await assert.rejects(participate(props), error => error === missing);
  }
  assert.throws(() => route('../auction/[slug]/page.tsx')(), error => error === missing);
});

test('real project routes preserve identity and defer network selection to the configuration gate', async () => {
  for (const [requested] of [[undefined, 'testnet'], ['testnet', 'testnet'], ['public', 'public'], ['mainnet', 'public']]) {
    const tree = await detail({ params: Promise.resolve({ slug: 'blue-man' }), searchParams: Promise.resolve({ network: requested }) });
    assert.equal(tree.type, 'BondingCurvePage');
    assert.equal(tree.props.slug, 'blue-man');
    assert.equal(tree.props.network, undefined);
  }
});

test('participation links reach the real trading page and retain query parameters', async () => {
  await assert.rejects(participate({
    params: Promise.resolve({ slug: 'blue-man' }),
    searchParams: Promise.resolve({ network: 'public', tag: ['one', 'two'], unused: undefined }),
  }), error => error.href === `/launches/blue-man?network=public&tag=one&tag=two`);
});


test('canonical plural routes read API slugs', async () => {
  const canonical = route('../launches/[slug]/page.tsx');
  const tree = await canonical({ params: Promise.resolve({ slug: 'blue-man' }), searchParams: Promise.resolve({ network: 'public' }) });
  assert.equal(tree.props.slug, 'blue-man');
});
