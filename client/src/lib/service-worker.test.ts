import { describe, expect, it, vi, beforeEach } from 'vitest';
// @ts-expect-error - vite raw import
import SW_SRC from '../../public/sw.js?raw';

// Enumerated through Vite rather than `fs` so the lookup does not depend on
// the working directory the runner happens to start in.
const IMAGE_MODULES = import.meta.glob('../../public/exercise-images/*', { eager: false });

/**
 * The service worker is plain script served as-is, so it is exercised here by
 * evaluating it against a stand-in `self` and Cache API and then invoking the
 * handlers it registers. That is enough to pin the caching strategy; the
 * browser-level behaviour (no self-reload, genuinely working offline) is
 * covered by e2e/offline.spec.ts.
 */

const SHELL_HTML =
  '<!doctype html><html><head>' +
  '<link rel="stylesheet" crossorigin href="/assets/index-ABC123.css">' +
  '</head><body><div id="root"></div>' +
  '<script type="module" crossorigin src="/assets/index-XYZ789.js"></script>' +
  '</body></html>';

type StoredResponse = {
  url: string;
  ok: boolean;
  type: string;
  clone: () => StoredResponse;
  text: () => Promise<string>;
};

function makeResponse(url: string, body = '', ok = true): StoredResponse {
  const response: StoredResponse = {
    url,
    ok,
    type: 'basic',
    clone: () => makeResponse(url, body, ok),
    text: async () => body,
  };
  return response;
}

const ORIGIN = 'https://ironpath.app';

/**
 * The real Cache API keys entries by fully-resolved URL, so `cache.add('/')`
 * and a request for `https://host/` are the same entry. Modelling that matters
 * here: a fake that keys on the literal string would report a cache miss where
 * the browser reports a hit, and a cache-first worker would look like a
 * network-first one.
 */
const cacheKey = (key: string | { url: string }) =>
  new URL(typeof key === 'string' ? key : key.url, ORIGIN).href;

function createHarness({ offline = false }: { offline?: boolean } = {}) {
  const store = new Map<string, Map<string, StoredResponse>>();
  const fetched: string[] = [];

  const fetchImpl = vi.fn(async (request: string | { url: string }) => {
    const url = typeof request === 'string' ? request : request.url;
    fetched.push(url);
    if (offline) throw new Error('offline');
    return makeResponse(url, url.endsWith('index.html') || url.endsWith('/') ? SHELL_HTML : 'body');
  });

  function openCache(name: string) {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name)!;
    return {
      async addAll(urls: string[]) {
        for (const url of urls) entries.set(cacheKey(url), await fetchImpl(url));
      },
      async add(url: string) {
        entries.set(cacheKey(url), await fetchImpl(url));
      },
      async put(key: string | { url: string }, value: StoredResponse) {
        entries.set(cacheKey(key), value);
      },
      async match(key: string | { url: string }) {
        return entries.get(cacheKey(key));
      },
    };
  }

  const caches = {
    open: vi.fn(async (name: string) => openCache(name)),
    keys: vi.fn(async () => Array.from(store.keys())),
    delete: vi.fn(async (name: string) => store.delete(name)),
    match: vi.fn(async (key: string | { url: string }) => {
      const resolved = cacheKey(key);
      for (const entries of store.values()) {
        if (entries.has(resolved)) return entries.get(resolved);
      }
      return undefined;
    }),
  };

  const handlers: Record<string, (event: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      handlers[type] = fn;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
    location: { origin: 'https://ironpath.app' },
  };

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'console', 'URL', 'Response', SW_SRC)(
    self,
    caches,
    fetchImpl,
    { log: () => {}, error: () => {} },
    URL,
    { error: () => makeResponse('error', '', false) },
  );

  return { handlers, self, caches, store, fetched, fetchImpl };
}

async function runInstall(h: ReturnType<typeof createHarness>) {
  let waited: Promise<unknown> = Promise.resolve();
  h.handlers.install({ waitUntil: (p: Promise<unknown>) => (waited = p) });
  await waited;
}

async function runFetch(
  h: ReturnType<typeof createHarness>,
  request: { method?: string; mode?: string; url: string },
) {
  let responded: Promise<StoredResponse | undefined> | undefined;
  h.handlers.fetch({
    request: { method: 'GET', mode: 'no-cors', ...request },
    respondWith: (p: Promise<StoredResponse | undefined>) => (responded = p),
  });
  return responded ? await responded : undefined;
}

let harness: ReturnType<typeof createHarness>;
beforeEach(() => {
  harness = createHarness();
});

describe('lifecycle', () => {
  it('registers the handlers it needs', () => {
    expect(Object.keys(harness.handlers).sort()).toEqual(
      ['activate', 'fetch', 'install', 'message'].sort(),
    );
  });

  it('does not seize control of open pages during install', async () => {
    await runInstall(harness);
    // skipWaiting here is what let a new worker take over mid-session and,
    // with the old registration script, reload the page out from under you.
    expect(harness.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('still honours an explicit SKIP_WAITING message', () => {
    harness.handlers.message({ data: { type: 'SKIP_WAITING' } });
    expect(harness.self.skipWaiting).toHaveBeenCalled();
  });

  it('ignores unrelated messages', () => {
    harness.handlers.message({ data: { type: 'SOMETHING_ELSE' } });
    harness.handlers.message({});
    expect(harness.self.skipWaiting).not.toHaveBeenCalled();
  });
});

describe('install precaching', () => {
  it('caches the app shell', async () => {
    await harness.caches.open('ironpath-v3-ironpath');
    await runInstall(harness);
    expect(harness.fetched).toContain('/index.html');
    expect(harness.fetched).toContain('/manifest.json');
  });

  it('caches the exercise reference photos', async () => {
    await runInstall(harness);
    const images = harness.fetched.filter(url => url.startsWith('/exercise-images/'));
    expect(images.length).toBeGreaterThan(30);
    expect(images).toContain('/exercise-images/placeholder.svg');
  });

  it('caches the hashed bundles this build references', async () => {
    await runInstall(harness);
    // Discovered by reading the shell, since their names change per build.
    expect(harness.fetched).toContain('/assets/index-XYZ789.js');
    expect(harness.fetched).toContain('/assets/index-ABC123.css');
  });
});

describe('fetch strategy', () => {
  it('serves navigations from the network so deploys land', async () => {
    await runInstall(harness);
    harness.fetched.length = 0;

    await runFetch(harness, { mode: 'navigate', url: 'https://ironpath.app/' });

    expect(harness.fetched).toContain('https://ironpath.app/');
  });

  it('falls back to the cached shell when the network is gone', async () => {
    await runInstall(harness);
    const offline = createHarness({ offline: true });
    // Prime the offline harness with an installed cache, then go dark.
    const cache = await offline.caches.open('ironpath-v3-ironpath');
    await cache.put('/index.html', makeResponse('/index.html', SHELL_HTML));

    const response = await runFetch(offline, {
      mode: 'navigate',
      url: 'https://ironpath.app/history',
    });

    expect(await response?.text()).toBe(SHELL_HTML);
  });

  it('serves hashed assets from cache without touching the network', async () => {
    const url = 'https://ironpath.app/assets/index-XYZ789.js';
    const cache = await harness.caches.open('ironpath-v3-ironpath');
    await cache.put(url, makeResponse(url, 'js'));
    harness.fetched.length = 0;

    const response = await runFetch(harness, { url });

    expect(await response?.text()).toBe('js');
    expect(harness.fetched).toHaveLength(0);
  });

  it('leaves cross-origin requests alone', async () => {
    const result = await runFetch(harness, { url: 'https://example.com/tracker.js' });
    expect(result).toBeUndefined();
  });

  it('leaves non-GET requests alone', async () => {
    const result = await runFetch(harness, { method: 'POST', url: 'https://ironpath.app/api' });
    expect(result).toBeUndefined();
  });
});

describe('the precache list stays in step with the repo', () => {
  it('lists every file in public/exercise-images', () => {
    const onDisk = Object.keys(IMAGE_MODULES)
      .map(path => path.split('/').pop() as string)
      .sort();
    const listed = Array.from(
      (SW_SRC as string).matchAll(/'\/exercise-images\/([^']+)'/g),
      (m: RegExpMatchArray) => m[1],
    ).sort();

    expect(onDisk.length).toBeGreaterThan(0);
    expect(listed).toEqual(onDisk);
  });
});
