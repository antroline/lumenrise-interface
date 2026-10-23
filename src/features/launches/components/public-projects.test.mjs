import { configurationModule, networkModule } from '../../../configuration-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(path, imports, globals = {}) {
  const exports = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { exports, require: name => name.endsWith('/api/config') ? configurationModule : imports(name), URL, URLSearchParams, ...globals },
  );
  return exports;
}
const directory = compile('../lib/directory.ts', () => ({}));
class ApiError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}
const status = (data, extra = {}) => ({
  data,
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch() {},
  ...extra,
});
function harness(initial = status(), initialProps = {}) {
  let query = initial,
    props = { network: 'testnet', page: 1, ...initialProps },
    states = [],
    effects = [],
    stateIndex = 0,
    effectIndex = 0,
    dirty = false,
    tree,
    options;
  const calls = [],
    cancellations = [],
    timers = new Map();
  let timerId = 0;
  const router = {
    push: (url) => calls.push(url),
    replace: (url) => calls.push(url),
  };
  const reads = [];
  const client = {
    cancelQueries: (value) => cancellations.push(value),
    fetchQuery: async (options) => {
      reads.push(options);
      return query.data;
    },
  };
  const jsx = (type, props) => ({
    type: typeof type === 'function' ? type.name : type,
    props,
  });
  const react = {
    useState(initial) {
      const i = stateIndex++;
      if (!(i in states))
        states[i] = typeof initial === 'function' ? initial() : initial;
      return [
        states[i],
        (value) => {
          states[i] = typeof value === 'function' ? value(states[i]) : value;
          dirty = true;
        },
      ];
    },
    useEffect(fn, deps) {
      const i = effectIndex++,
        prev = effects[i];
      if (!prev || deps.some((value, index) => value !== prev.deps[index])) {
        prev?.cleanup?.();
        effects[i] = { fn, deps, pending: true };
      }
    },
  };
  const component = compile(
    './public-projects.tsx',
    (name) => {
      if (name === '@/lib/api/config') return configurationModule;
      if (name === '@/lib/stellar/network') return networkModule;
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime')
        return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name === 'next/navigation') return { useRouter: () => router };
      if (name === '@tanstack/react-query')
        return {
          useQuery: (value) => {
            options = value;
            return query;
          },
          useQueryClient: () => client,
        };
      if (name === '@stellar/stellar-sdk') return require(name);
      if (name.endsWith('/directory')) return directory;
      if (name.endsWith('/launch-filters'))
        return { LaunchFilters: 'LaunchFilters', launchSortLabels: {} };
      if (name.endsWith('/results-transition'))
        return { ResultsLink: 'ResultsLink', useResultsPending: () => false };
      if (name.endsWith('/directory-data'))
        return {
          directoryKey: (r) => ['launch-list', r],
          getDirectory: () => {},
        };
      if (name.endsWith('/queries'))
        return { publicQueryOptions: {}, usePageVisible: () => true };
      if (name.endsWith('/client')) return { ApiError };
      if (name.endsWith('/utils'))
        return { cn: (...values) => values.filter(Boolean).join(' ') };
      if (name.endsWith('/display'))
        return {
          pairLabel: () => 'USDC',
          displayAmount: (raw) => raw,
          compactAmount: (raw) => raw,
        };
      if (name.endsWith('/external-url'))
        return { safeExternalUrl: () => undefined };
      return new Proxy(
        {},
        { get: (_, key) => (key === '__esModule' ? false : String(key)) },
      );
    },
    {
      setTimeout: (fn, delay) => {
        assert.equal(delay, 300);
        const id = ++timerId;
        timers.set(id, fn);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  function render(nextProps = {}, nextQuery = query) {
    props = { ...props, ...nextProps };
    query = nextQuery;
    let count = 0;
    do {
      dirty = false;
      stateIndex = effectIndex = 0;
      tree = component.PublicProjects(props);
      if (++count > 5) throw Error('Render loop');
    } while (dirty);
    for (const effect of effects)
      if (effect.pending) {
        effect.pending = false;
        effect.cleanup = effect.fn();
      }
    return tree;
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [
      node,
      ...[node.props?.children].flat(Infinity).flatMap((child) => nodes(child)),
    ];
  }
  const find = (type) => nodes(tree).find((node) => node.type === type);
  const field = (id) => nodes(tree).find((node) => node.props?.id === id);
  function tick() {
    for (const [id, fn] of [...timers]) {
      timers.delete(id);
      fn();
    }
  }
  render();
  return {
    render,
    nodes: () => nodes(tree),
    find,
    field,
    tick,
    calls,
    cancellations,
    reads,
    timers,
    get options() {
      return options;
    },
    get text() {
      return JSON.stringify(tree);
    },
  };
}
const launch = (id, extras = {}) => ({
  network: 'testnet',
  contractId: id,
  slug: `project-${id}`,
  pair: 'PAIR',
  category: 'bonding-curve',
  createdAt: null,
  metadata: { name: id, symbol: id },
  bonding: null,
  volume24h: { grossPairAmount: '9007199254740993', tradeCount: 2 },
  ...extras,
});
test('loading, empty, 400 and 503 are distinct and actionable', () => {
  const loading = harness(status(undefined, { isPending: true }));
  assert.ok(loading.find('ProjectsTableSkeleton'));
  assert.ok(!loading.text.includes('No launches yet'));
  const empty = harness(status({ launches: [], total: 0 }));
  assert.ok(empty.text.includes('No launches yet'));
  assert.ok(empty.text.includes('0 shown'));
  for (const code of [400, 503]) {
    const failed = harness(
      status(undefined, { isError: true, error: new ApiError(code) }),
    );
    assert.ok(
      failed.text.includes(
        code === 400
          ? 'Invalid launch filters'
          : 'Launch service temporarily unavailable',
      ),
    );
    assert.ok(!failed.text.includes('No launches yet'));
    assert.ok(failed.text.includes('Retry'));
  }
});
test('backend order and total survive combined filters, null bonding and unknown creation dates', () => {
  const h = harness(
    status({
      launches: [
        launch('z'),
        launch('a', { createdAt: '2026-01-01T00:00:00Z' }),
      ],
      total: 45,
    }),
    {
      page: 2,
      search: 'does-not-match',
      owner: 'owner',
      category: 'bonding-curve',
      sort: 'almostGraduated',
    },
  );
  const table = h.find('ProjectsTable');
  assert.deepEqual(
    Array.from(table.props.rows, (row) => row.name),
    ['z', 'a'],
  );
  assert.equal(table.props.rows[0].date, '—');
  assert.equal(table.props.rows[0].dateTitle, 'Contract creation date unknown');
  assert.ok(h.text.includes('45 projects') || h.text.includes('of 45'));
  const next = h
    .nodes()
    .find((node) => node.props?.['aria-label'] === 'Next page').props.render
    .props.href;
  const params = new URL(next, 'http://local').searchParams;
  assert.equal(params.get('page'), '3');
  assert.equal(params.get('search'), 'does-not-match');
  assert.equal(params.get('owner'), 'owner');
  assert.equal(h.options.queryKey[1].sort, 'almostGraduated');
});
test('cached data shows skeletons during fetching for every request parameter', () => {
  const data = { launches: [launch('a')], total: 1 };
  const h = harness(status(data));
  assert.equal(h.options.refetchOnMount, 'always');
  for (const changes of [
    { search: 'token' }, { category: 'bonding-curve' }, { sort: 'name' },
    { direction: 'asc' }, { owner: 'owner' }, { pair: 'asset' },
    { network: 'public' }, { limit: 50 }, { page: 2 },
  ]) {
    h.render(changes, status(data, { isFetching: true }));
    assert.ok(h.find('ProjectsTableSkeleton'));
    assert.ok(h.find('MobileProjectListSkeleton'));
    assert.ok(!h.find('ProjectsTable'));
  }
  h.render({ page: 1 }, status(data));
  assert.ok(h.find('ProjectsTable'));
  assert.ok(!h.find('ProjectsTableSkeleton'));
});
test('drawer Apply shows skeletons until its request completes', async () => {
  const h = harness(status({ launches: [launch('a')], total: 1 }));
  const pending = h.find('LaunchFilters').props.onApply({
    network: 'testnet', page: 1, limit: 20, category: 'all',
    sort: 'newest', direction: 'desc', search: 'new', pair: '',
  });
  h.render();
  assert.ok(h.find('ProjectsTableSkeleton'));
  await pending;
  h.render();
  assert.ok(!h.find('ProjectsTableSkeleton'));
});
test('monetary sorts require a contract, display inline volume exactly and retain selected pair', () => {
  const { Asset, Networks } = require('@stellar/stellar-sdk');
  const pair = Asset.native().contractId(Networks.TESTNET);
  for (const sort of ['topVolume', 'figure']) {
    const blocked = harness(status(), { sort, pair: 'XLM' });
    assert.equal(blocked.options.enabled, false);
    assert.ok(blocked.text.includes('Select a payment asset'));
  }
  const h = harness(status({ launches: [launch('a', { pair })], total: 1 }), {
    sort: 'topVolume',
    pair,
  });
  assert.equal(
    h.find('ProjectsTable').props.rows[0].figure,
    '9007199254740993 USDC',
  );
  assert.equal(h.find('ProjectsTable').props.figureLabel, 'Volume · 24h');
  const reverseVolume = new URL(
    h.find('ProjectsTable').props.sorting.link('figure').href,
    'http://local',
  ).searchParams;
  assert.equal(reverseVolume.get('sort'), 'topVolume');
  assert.equal(reverseVolume.get('direction'), 'asc');
});

test('shared Apply preloads the existing query cache and preserves all URL filters', async () => {
  const h = harness(status({ launches: [], total: 0 }), {
    owner: 'owner',
    page: 3,
  });
  const next = {
    network: 'testnet',
    page: 1,
    limit: 50,
    owner: 'owner',
    search: 'alpha',
    category: 'bonding-curve',
    sort: 'name',
    direction: 'asc',
    pair: '',
  };
  assert.equal(h.reads.length, 0);
  await h.find('LaunchFilters').props.onApply(next);
  assert.equal(h.reads.length, 1);
  assert.equal(h.reads[0].retry, false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.reads[0].queryKey[1])), next);
  const params = new URL(h.calls.at(-1), 'http://local').searchParams;
  for (const [key, value] of Object.entries(next))
    if (value !== '') assert.equal(params.get(key), String(value));
});

test('toolbar Clear immediately removes filters but preserves network, sort and direction', () => {
  const h = harness(status({ launches: [], total: 0 }), {
    network: 'public',
    search: 'needle',
    owner: 'owner',
    category: 'bonding-curve',
    sort: 'name',
    direction: 'asc',
    pair: 'asset',
    limit: 50,
  });
  const clear = h
    .nodes()
    .find((node) => node.props?.['aria-label'] === 'Clear filters');
  assert.ok(clear);
  const clearHref = clear.props.render.props.render.props.href;
  assert.equal(
    h.reads.length,
    0,
    'Clear navigates immediately, without the drawer Apply step',
  );
  const params = new URL(clearHref, 'http://local').searchParams;
  assert.equal(params.get('network'), 'public');
  assert.equal(params.get('sort'), 'name');
  assert.equal(params.get('direction'), 'asc');
  assert.equal(params.get('category'), 'all');
  assert.equal(params.get('page'), '1');
  assert.equal(params.get('limit'), '20');
  for (const key of ['search', 'owner', 'pair'])
    assert.equal(params.has(key), false);
  h.render({ search: '', owner: '', category: 'all', pair: '', limit: 20 });
  assert.ok(
    !h.nodes().some((node) => node.props?.['aria-label'] === 'Clear filters'),
  );
});
test('monetary Clear keeps its required asset and disappears when only sort settings remain', () => {
  const { Asset, Networks } = require('@stellar/stellar-sdk');
  const pair = Asset.native().contractId(Networks.TESTNET);
  const h = harness(status({ launches: [], total: 0 }), {
    sort: 'topVolume',
    pair,
    search: 'a',
  });
  const clearHref = h.nodes()
    .find((node) => node.props?.['aria-label'] === 'Clear filters')
    .props.render.props.render.props.href;
  const params = new URL(clearHref, 'http://local').searchParams;
  assert.equal(params.get('pair'), pair);
  assert.equal(params.get('sort'), 'topVolume');
  h.render({ search: '' });
  assert.ok(
    !h.nodes().some((node) => node.props?.['aria-label'] === 'Clear filters'),
  );
  assert.equal(h.options.enabled, true);
});


test('directory links use server slugs and unresolved projects return to the directory', () => {
  const h = harness(status({ launches: [launch('contract', { slug: 'blue-man', metadata: { name: 'A different display name', symbol: 'TOK' } }), launch('legacy', { slug: null })], total: 2 }));
  const rows = h.find('ProjectsTable').props.rows;
  assert.equal(rows[0].href, '/projects/blue-man?network=testnet');
  assert.equal(rows[1].href, '/projects?network=testnet');
});
