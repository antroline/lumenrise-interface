import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = dirname(fileURLToPath(import.meta.url));
const normalize = (path) => relative(root, path).split(sep).join('/');
const files = readdirSync(root, { recursive: true })
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => resolve(root, file));
const graph = new Map();

for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, imports.filter((name) => name.startsWith('.') || name.startsWith('@/')).map((name) => {
    const base = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(dirname(file), name);
    const target = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
      .find((candidate) => existsSync(candidate) && (extname(candidate) || files.includes(candidate)));
    assert.ok(target, `Unresolved import ${name} in ${normalize(file)}`);
    return target;
  }));
}

function routeOwner(file) {
  let directory = dirname(file);
  while (directory !== root && !existsSync(join(directory, 'page.tsx')) && !existsSync(join(directory, 'layout.tsx'))) {
    directory = dirname(directory);
  }
  return directory;
}

test('route-private modules stay inside their owning route', () => {
  for (const [file, imports] of graph) {
    for (const target of imports.filter((path) => normalize(path).startsWith('app/'))) {
      if (extname(target) === '.css') continue;
      assert.ok(normalize(file).startsWith('app/'), `${normalize(file)} imports route internals: ${normalize(target)}`);
      assert.equal(routeOwner(file), routeOwner(target), `${normalize(file)} imports another route's private module: ${normalize(target)}`);
    }
  }
});

test('shared libraries, hooks and UI primitives do not import features', () => {
  for (const [file, imports] of graph) {
    if (!/^(lib\/|hooks\/|components\/ui\/)/.test(normalize(file))) continue;
    for (const target of imports) {
      assert.ok(!normalize(target).startsWith('features/'), `${normalize(file)} depends on a feature: ${normalize(target)}`);
    }
  }
});

test('feature modules do not import each other through implementation details', () => {
  for (const [file, imports] of graph) {
    const owner = normalize(file).match(/^features\/([^/]+)\//)?.[1];
    if (!owner) continue;
    for (const target of imports) {
      const feature = normalize(target).match(/^features\/([^/]+)\//)?.[1];
      const publicEntry = /^features\/[^/]+\/index\.ts$/.test(normalize(target));
      assert.ok(!feature || feature === owner || publicEntry, `${normalize(file)} couples to ${normalize(target)}; use its public entry or extract the shared responsibility`);
    }
  }
});

test('application modules have no circular imports', () => {
  const visited = new Set();
  function visit(file, stack = []) {
    assert.ok(!stack.includes(file), `Circular dependency: ${[...stack, file].map(normalize).join(' → ')}`);
    if (visited.has(file)) return;
    for (const target of graph.get(file) ?? []) visit(target, [...stack, file]);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
});
