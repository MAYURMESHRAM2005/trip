import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// The jsdom test environment replaces the global URL; node:url's is needed for
// file resolution and is what the sandboxed worker should see.
import { URL as NodeURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';

/**
 * The service worker is a plain script in public/, so it is executed here in a
 * minimal vm sandbox with stubbed Cache Storage / fetch. These tests pin the
 * behaviour that a stale app shell used to hide every new deployment from
 * browsers that had already visited the site.
 */
const ORIGIN = 'https://app.example.com';
const SW_SOURCE = readFileSync(fileURLToPath(new NodeURL('../../public/sw.js', import.meta.url)), 'utf8');

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
  }
  clone() {
    return new FakeResponse(this.body, { status: this.status });
  }
  async json() {
    return JSON.parse(this.body);
  }
}

function createWorker({ online = true } = {}) {
  const handlers = {};
  const stores = new Map();
  const fetched = [];
  const routes = new Map();

  const keyOf = (request) => (typeof request === 'string' ? new NodeURL(request, ORIGIN).href : request.url);
  const cacheStore = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };

  const caches = {
    open: async (name) => {
      cacheStore(name); // opening a cache creates it, even before anything is stored
      return {
        match: async (request) => cacheStore(name).get(keyOf(request)),
        put: async (request, response) => {
          cacheStore(name).set(keyOf(request), response);
        },
        addAll: async (urls) => urls.forEach((u) => cacheStore(name).set(keyOf(u), new FakeResponse('precached-shell'))),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request) => {
      const key = keyOf(request);
      for (const store of stores.values()) if (store.has(key)) return store.get(key);
      return undefined;
    },
  };

  const workerFetch = async (input) => {
    const url = typeof input === 'string' ? new NodeURL(input, ORIGIN).href : input.url;
    fetched.push(url);
    if (!online) throw new TypeError('Failed to fetch');
    const response = routes.get(url);
    // No route registered -> the host answers 404 (what Vercel does for a deep
    // link it has no rewrite for).
    return response ? response.clone() : new FakeResponse('not found', { status: 404 });
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, handler) => {
      handlers[type] = handler;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  vm.runInContext(SW_SOURCE, vm.createContext({ self, caches, fetch: workerFetch, Response: FakeResponse, URL: NodeURL, console }));

  return {
    caches,
    stores,
    fetched,
    route: (path, response) => routes.set(new NodeURL(path, ORIGIN).href, response),
    runLifecycle: async (type) => {
      let work;
      handlers[type]({ waitUntil: (promise) => (work = promise) });
      await work;
    },
    dispatch: async (target, { mode = 'no-cors', method = 'GET' } = {}) => {
      const request = { method, url: target.startsWith('http') ? target : new NodeURL(target, ORIGIN).href, mode };
      let pending;
      handlers.fetch({ request, respondWith: (promise) => (pending = promise) });
      return pending ? await pending : undefined;
    },
  };
}

const navigate = (worker, path) => worker.dispatch(path, { mode: 'navigate' });

describe('service worker app-shell freshness', () => {
  it('installs the versioned shell cache and drops caches from older versions', async () => {
    const worker = createWorker();
    await worker.runLifecycle('install');
    expect(worker.stores.has('travelmind-shell-v2')).toBe(true);

    // Caches written by the previous release.
    await worker.caches.open('travelmind-shell-cache');
    await worker.caches.open('travelmind-itinerary-cache');
    await worker.runLifecycle('activate');

    expect(worker.stores.has('travelmind-shell-cache')).toBe(false);
    expect(worker.stores.has('travelmind-shell-v2')).toBe(true);
    // Cached itineraries are still worth keeping for offline reading.
    expect(worker.stores.has('travelmind-itinerary-cache')).toBe(true);
  });

  it('serves a navigation from the network so a new deployment is picked up', async () => {
    const worker = createWorker();
    await worker.runLifecycle('install');
    await (await worker.caches.open('travelmind-shell-v2')).put({ url: `${ORIGIN}/` }, new FakeResponse('shell-from-first-visit'));
    worker.route('/', new FakeResponse('shell-after-deploy'));

    const response = await navigate(worker, '/');

    expect(response.body).toBe('shell-after-deploy');
    expect(worker.fetched).toContain(`${ORIGIN}/`);
  });

  it('falls back to the cached shell when the network is unavailable', async () => {
    const worker = createWorker({ online: false });
    await worker.runLifecycle('install');

    const response = await navigate(worker, '/login');

    expect(response.body).toBe('precached-shell');
  });

  it('falls back to the shell when the host 404s a client-side route', async () => {
    const worker = createWorker();
    await worker.runLifecycle('install');

    const response = await navigate(worker, '/register');

    expect(response.status).toBe(200);
    expect(response.body).toBe('precached-shell');
  });

  it('serves fingerprinted assets from cache without a network call', async () => {
    const worker = createWorker();
    await worker.runLifecycle('install');
    const asset = `${ORIGIN}/assets/index-abc123.js`;
    await (await worker.caches.open('travelmind-shell-v2')).put({ url: asset }, new FakeResponse('cached-asset'));

    const response = await worker.dispatch('/assets/index-abc123.js');

    expect(response.body).toBe('cached-asset');
    expect(worker.fetched).toEqual([]);
  });

  it('keeps API reads network-first and answers 503 while offline', async () => {
    const online = createWorker();
    online.route('/api/trips/42', new FakeResponse('{"success":true}'));
    await online.runLifecycle('install');
    const ok = await online.dispatch('/api/trips/42');
    expect(ok.body).toBe('{"success":true}');

    const offline = createWorker({ online: false });
    const failed = await offline.dispatch('/api/trips/42');
    expect(failed.status).toBe(503);
    expect((await failed.json()).offline).toBe(true);
  });

  it('leaves cross-origin requests (the API host) to the browser', async () => {
    const worker = createWorker();
    await worker.runLifecycle('install');

    const response = await worker.dispatch('https://travelmindai.onrender.com/api/auth/refresh', { mode: 'cors' });

    expect(response).toBeUndefined();
    expect(worker.fetched).toEqual([]);
  });
});
