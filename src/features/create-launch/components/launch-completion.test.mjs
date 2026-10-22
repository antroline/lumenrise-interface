import { networkModule } from '../../../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('./launch-completion.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const mocks = {
  '../hooks/use-completion-message': { useCompletionMessage: (message) => ({ message, onEntered() {} }) },
  '../lib/launch-motion': { launchTransition: { duration: 0.2 }, useLaunchReducedMotion: () => true },
  'next/link': { __esModule: true, default: 'a' },
  'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowUpRight', 'Check', 'CircleAlert', 'LoaderCircle', 'Wallet'].map(name => [name, 'svg'])),
  '@/components/ui/avatar': { Avatar: 'span', AvatarFallback: 'span', AvatarImage: 'img' },
  '@/components/ui/button': { Button: 'button', buttonVariants: () => 'button' },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
};
runInNewContext(source, { module, exports: module.exports, URLSearchParams, require: name => name === '@/lib/stellar/network' ? networkModule : mocks[name] ?? require(name) });
const render = operation => renderToStaticMarkup(createElement(module.exports.LaunchCompletion, {
  operation, working: operation?.status === 'running', name: 'Example', symbol: 'EX', logo: '', onRetry() {}, onBack() {},
}));

test('wallet approval displays all three steps inline without dismiss or retry controls', () => {
  const html = render({ step: 'deploy', phase: 'approval', status: 'running', message: '', transactionHashes: { setup: 'setup-hash' } });
  assert.match(html, /Bringing your launch to life/);
  assert.match(html, /Awaiting signature/);
  assert.match(html, /Set up token/);
  assert.match(html, /Deploy token contract/);
  assert.match(html, /Create launch/);
  assert.match(html, /testnet\/tx\/setup-hash/);
  assert.match(html, /motion-reduce:animate-none/);
  assert.doesNotMatch(html, /role="dialog"|Close|Back to review|Check \/ retry/);
});

test('indexing failures retain completed signatures and expose recovery actions and the actual error', () => {
  const html = render({ step: 'index', phase: 'working', status: 'error', message: 'The project page is still preparing.' });
  assert.match(html, /role="alert"/);
  assert.match(html, /The project page is still preparing/);
  assert.equal((html.match(/>Complete</g) ?? []).length, 3);
  assert.match(html, /Back to review/);
  assert.match(html, /Check \/ retry/);
  assert.doesNotMatch(html, /animate-spin/);
});

test('success retains the three completed steps and links to the confirmed launch', () => {
  const html = render({ step: 'index', phase: 'confirming', status: 'success', message: '', curveAddress: 'confirmed-curve' });
  assert.match(html, /Your launch is ready/);
  assert.match(html, /href="\/launch\/confirmed-curve\?network=testnet"/);
  assert.equal((html.match(/>Complete</g) ?? []).length, 3);
  assert.doesNotMatch(html, /animate-spin|Back to review|Check \/ retry/);
});
