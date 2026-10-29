import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Cover the SDK renderer, not just our provider: its recent-wallet row is mapped
// into the login list. Remove this dependency patch when Privy fixes it upstream.
for (const format of ['esm', 'cjs']) test(`Privy recent-wallet rows have stable list keys (${format})`, () => {
  const directory = new URL(`../../../node_modules/@privy-io/react-auth/dist/${format}/`, import.meta.url);
  const file = readdirSync(directory).find(name =>
    name.startsWith('CustomLandingScreenView-') && name.endsWith(format === 'esm' ? '.mjs' : '.js'));
  assert.ok(file, 'Expected the pinned Privy login renderer');
  const source = ts.createSourceFile(file, readFileSync(new URL(file, directory), 'utf8'), ts.ScriptTarget.Latest, true);
  const rows = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const props = node.arguments[1];
      if (props && ts.isObjectLiteralExpression(props) && props.properties.some(property =>
        ts.isPropertyAssignment(property) && property.name.getText(source) === 'recent'
          && (property.initializer.kind === ts.SyntaxKind.TrueKeyword
            || property.initializer.getText(source) === '!0'))) rows.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(rows.length, 1, 'Expected one recent-wallet JSX renderer');
  const row = rows[0];
  assert.equal(row.arguments.length, 3, 'Recent wallet JSX must receive a key');
  let mapper = row.parent;
  while (mapper && !ts.isArrowFunction(mapper)) mapper = mapper.parent;
  assert.ok(mapper, 'Expected the wallet login-method mapper');
  assert.equal(row.arguments[2].getText(source), mapper.parameters[0].name.getText(source));
});
