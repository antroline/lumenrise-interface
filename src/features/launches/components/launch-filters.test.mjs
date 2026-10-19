import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const directory = {};
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../lib/directory.ts', import.meta.url), 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText,
  { exports: directory, URLSearchParams },
);
const XLM = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const USDC = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
const defaults = {
  network: 'testnet',
  page: 1,
  limit: 20,
  owner: '',
  search: '',
  pair: '',
  category: 'all',
  sort: 'newest',
  direction: 'desc',
};
function harness(request = defaults, apply = async () => {}) {
  let states = [],
    index = 0,
    dirty = false,
    tree,
    props = { request, open: true },
    calls = [],
    closed = [];
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('./launch-filters.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    {
      exports,
      JSON,
      Error,
      require: (name) => {
        if (name === 'react')
          return {
            useState(initial) {
              const i = index++;
              if (!(i in states)) states[i] = initial;
              return [
                states[i],
                (value) => {
                  states[i] =
                    typeof value === 'function' ? value(states[i]) : value;
                  dirty = true;
                },
              ];
            },
          };
        if (name === 'react/jsx-runtime')
          return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === '@stellar/stellar-sdk') return require(name);
        if (name.endsWith('/directory')) return directory;
        if (name.endsWith('/display')) return { pairLabel: () => 'PAIR' };
        return new Proxy({}, { get: (_, key) => key });
      },
    },
  );
  function render(changes = {}) {
    props = { ...props, ...changes };
    let iterations = 0;
    do {
      dirty = false;
      index = 0;
      tree = exports.LaunchFilters({
        ...props,
        onOpenChange: (value) => closed.push(value),
        onApply: async (value) => {
          calls.push(value);
          await apply(value);
        },
      });
      if (++iterations > 5) throw Error('Render loop');
    } while (dirty);
  }
  function nodes(node) {
    return node && typeof node === 'object'
      ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
      : [];
  }
  const all = () => nodes(tree);
  const group = (name) =>
    all().find(
      (node) =>
        node.type === 'ToggleGroup' && node.props['aria-label'] === name,
    );
  const input = (id) => all().find((node) => node.props?.id === id);
  const button = (text) =>
    all().find(
      (node) =>
        node.type === 'Button' && [node.props.children].flat().includes(text),
    );
  const submit = async () => {
    await all()
      .find((node) => node.type === 'form')
      .props.onSubmit({ preventDefault() {} });
    await new Promise((r) => setImmediate(r));
    render();
  };
  render();
  return {
    render,
    all,
    group,
    input,
    button,
    submit,
    calls,
    closed,
    exports,
    get text() {
      return JSON.stringify(tree);
    },
  };
}
test('edits remain drafts until a single Apply, including combined advanced filters', async () => {
  const h = harness();
  h.input('launch-search').props.onChange({ target: { value: 'literal +%_' } });
  h.render();
  h.group('Category').props.onValueChange(['bonding-curve']);
  h.render();
  h.group('Sort').props.onValueChange(['topVolume']);
  h.render();
  h.all()
    .find(
      (n) =>
        n.type === 'ToggleGroup' &&
        n.props['aria-labelledby'] === 'launch-direction-label',
    )
    .props.onValueChange(['asc']);
  h.render();
  h.input('launch-owner').props.onChange({ target: { value: ' owner ' } });
  h.render();
  h.group('Payment asset').props.onValueChange([USDC]);
  h.render();
  h.group('Projects per page').props.onValueChange(['50']);
  h.render();
  assert.equal(h.calls.length, 0);
  await h.submit();
  assert.equal(h.calls.length, 1);
  const sent = h.calls[0];
  assert.equal(sent.search, 'literal +%_');
  assert.equal(sent.category, 'bonding-curve');
  assert.equal(sent.owner, 'owner');
  assert.equal(sent.sort, 'topVolume');
  assert.equal(sent.direction, 'asc');
  assert.equal(sent.pair, USDC);
  assert.equal(sent.limit, 50);
  assert.equal(sent.page, 1);
  assert.deepEqual(h.closed, [false]);
});
test('close/reopen and advanced collapse preserve unapplied values without requests', () => {
  const h = harness();
  assert.equal(h.all().find((n) => n.type === 'Accordion').props.open, false);
  h.input('launch-owner').props.onChange({ target: { value: 'draft-wallet' } });
  h.render();
  h.all()
    .find((n) => n.type === 'Accordion')
    .props.onOpenChange(true);
  h.render();
  h.all()
    .find((n) => n.type === 'Accordion')
    .props.onOpenChange(false);
  h.render();
  h.render({ open: false });
  h.render({ open: true });
  assert.equal(h.input('launch-owner').props.value, 'draft-wallet');
  assert.equal(h.calls.length, 0);
  h.render({ request: { ...defaults, page: 2 } });
  assert.equal(h.input('launch-owner').props.value, 'draft-wallet');
  h.render({ request: { ...defaults, search: 'history' } });
  assert.equal(h.input('launch-search').props.value, 'history');
});
test('Reset restores defaults while keeping selected network and defers application', async () => {
  const h = harness({
    ...defaults,
    network: 'public',
    search: 'a',
    owner: 'b',
    sort: 'trending',
    limit: 100,
    direction: 'asc',
  });
  h.button('Reset').props.onClick();
  h.render();
  assert.equal(h.calls.length, 0);
  await h.submit();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), {
    ...defaults,
    network: 'public',
  });
});
test('network switches map native contracts and clear invalid monetary selections', () => {
  const { Asset, Networks } = require('@stellar/stellar-sdk');
  const h = harness({ ...defaults, pair: XLM, sort: 'figure' });
  h.group('Network').props.onValueChange(['public']);
  h.render();
  assert.equal(h.group('Network').props.value[0], 'public');
  assert.equal(
    h.group('Payment asset').props.value[0],
    Asset.native().contractId(Networks.PUBLIC),
  );
  assert.equal(h.group('Sort').props.value[0], 'figure');
  const other = harness({ ...defaults, pair: USDC, sort: 'topVolume' });
  other.group('Network').props.onValueChange(['public']);
  other.render();
  assert.equal(other.group('Payment asset').props.value[0], 'any');
  assert.equal(other.group('Sort').props.value[0], 'newest');
});
test('invalid payment selections and failed Apply keep the drawer open and edits intact', async () => {
  const h = harness({ ...defaults, sort: 'topVolume' });
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.equal(h.closed.length, 0);
  assert.ok(h.text.includes('Choose a valid payment-asset contract'));
  assert.equal(h.all().find((n) => n.type === 'Accordion').props.open, true);
  const error = harness({ ...defaults, search: 'keep' }, async () => {
    throw Error('Service unavailable (503)');
  });
  await error.submit();
  assert.equal(error.closed.length, 0);
  assert.equal(error.input('launch-search').props.value, 'keep');
  assert.ok(error.text.includes('Service unavailable (503)'));
  error.render({ request: { ...defaults, search: 'history' } });
  assert.ok(!error.text.includes('Service unavailable (503)'));
});
test('sorting uses existing options and unavailable categories remain visibly disabled', () => {
  const h = harness();
  const items = h.all().filter((node) => node.type === 'ToggleGroupItem');
  for (const value of ['auction', 'pre-sale'])
    assert.equal(
      items.find((node) => node.props.value === value).props.disabled,
      true,
    );
  assert.equal(h.group('Sort').props.children.length, 10);
  assert.ok(!h.all().some((node) => node.type === 'Select'));
  assert.ok(
    h.all().some((node) => node.props?.['data-launch-filter-scroll'] === true),
  );
  assert.ok(
    h.all().some((node) => node.props?.['data-launch-filter-footer'] === true),
  );
});

test('custom contracts remain precise and Any asset clears the effective pair', async () => {
  const h = harness();
  h.group('Payment asset').props.onValueChange(['custom']);
  h.render();
  h.input('launch-custom-pair').props.onChange({ target: { value: USDC } });
  h.render();
  await h.submit();
  assert.equal(h.calls[0].pair, USDC);
  h.group('Payment asset').props.onValueChange(['any']);
  h.render();
  await h.submit();
  assert.equal(h.calls[1].pair, '');
  assert.equal(h.group('Payment asset').props.value[0], 'any');
});

test('filter icon badge counts clearable filters rather than preserved sorting settings', () => {
  const h = harness({
    ...defaults,
    network: 'public',
    sort: 'name',
    direction: 'asc',
    search: 'a',
    owner: 'owner',
    category: 'bonding-curve',
    pair: USDC,
    limit: 50,
  });
  assert.equal(h.all().find((node) => node.type === 'Badge').props.children, 5);
  assert.ok(
    h
      .all()
      .some(
        (node) =>
          node.type === 'TooltipTrigger' &&
          node.props['aria-label'] === 'Filters, 5 active filters',
      ),
  );
  const scoped = harness({ ...defaults, sort: 'topVolume', pair: USDC });
  assert.ok(!scoped.all().some((node) => node.type === 'Badge'));
});
