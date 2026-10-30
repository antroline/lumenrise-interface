import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Run the real, dependency-free registry in the existing Node test environment.
export function loadNetworkRegistry() {
  const cache = new Map();
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const { outputText } = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const module = { exports: {} };
    cache.set(url.href, module.exports);
    new Function('require', 'module', 'exports', outputText)(
      name => load(new URL(name + '.ts', url)), module, module.exports,
    );
    return module.exports;
  }
  return load(new URL('./registry.ts', import.meta.url));
}
