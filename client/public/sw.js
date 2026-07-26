/**
 * IronPath service worker.
 *
 * Two rules drive everything here:
 *
 * 1. The app must work with no signal. Someone in a basement gym needs the
 *    shell, the logging UI, and the exercise reference photos to be there.
 * 2. A deployed update must actually reach people, without ever interrupting
 *    a workout in progress.
 *
 * Those pull in opposite directions, so the strategy splits by request type:
 * navigations go to the network first (fresh HTML means fresh asset hashes, so
 * deploys land), and everything else is served cache-first (hashed bundles and
 * photos never change in place, so the cache is both correct and faster).
 *
 * Deliberately absent: `skipWaiting()` during install, and any automatic
 * `location.reload()`. A worker that takes over mid-session can leave the
 * running page asking for chunks that no longer exist, and the reload that
 * used to follow would discard anything not yet written by the 2s autosave.
 * The new worker waits, then takes over on the next cold start.
 */

const CACHE_VERSION = 'v3-ironpath';
const CACHE_NAME = `ironpath-${CACHE_VERSION}`;
const APP_SHELL = '/index.html';

/**
 * Match on URL alone, ignoring `Vary`.
 *
 * Static hosts commonly answer with `Vary: Origin` on assets. Precaching runs
 * from this worker, whose requests carry no `Origin` header, while the page
 * requests its own bundles via `<script crossorigin>` and `<link crossorigin>`,
 * which do. Honouring `Vary` therefore misses every precached bundle, and the
 * app boots fine online and then fails to start the first time it is opened
 * without signal. These are content-hashed, immutable files — a URL match is
 * exactly the right identity for them.
 */
const MATCH_OPTIONS = { ignoreVary: true };

// Without these there is no offline app, so a failure here should fail the
// install rather than leave a half-populated cache behind.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/icon-180x180.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Exercise reference photos. Precached because the moment you need one is
// standing in front of a machine you don't recognise, with no signal. Cached
// individually and tolerantly below: one missing photo must not cost you the
// entire offline app.
//
// Kept in step with the directory by a unit test, so adding a photo without
// listing it here fails CI rather than silently shipping it un-precached.
const EXERCISE_IMAGES = [
  '/exercise-images/1-arm-curl-with-twist.jpg',
  '/exercise-images/45-degree-leg-press.jpg',
  '/exercise-images/abductor.jpg',
  '/exercise-images/adductor.jpg',
  '/exercise-images/adjustable-cable-crossover.jpg',
  '/exercise-images/bar-curl.jpg',
  '/exercise-images/bent-over-rear-deltoid.jpg',
  '/exercise-images/body-squat.jpg',
  '/exercise-images/cable-front-deltoid-raise.jpg',
  '/exercise-images/close-grip-pulldown.jpg',
  '/exercise-images/glute-machine.jpg',
  '/exercise-images/high-pulley-kick-back.jpg',
  '/exercise-images/kick-back.jpg',
  '/exercise-images/lateral-raise-machine.jpg',
  '/exercise-images/lateral-raise.jpg',
  '/exercise-images/low-pulley-1-arm-curl.jpg',
  '/exercise-images/low-pulley-straight-bar-curl.jpg',
  '/exercise-images/pec-fly.jpg',
  '/exercise-images/placeholder.svg',
  '/exercise-images/preacher-curl.jpg',
  '/exercise-images/push-up.jpg',
  '/exercise-images/seated-back-extension.jpg',
  '/exercise-images/seated-chest-press.jpg',
  '/exercise-images/seated-dip.jpg',
  '/exercise-images/seated-lateral-raise.jpg',
  '/exercise-images/seated-leg-curl.jpg',
  '/exercise-images/seated-leg-extension.jpg',
  '/exercise-images/seated-leg-press.jpg',
  '/exercise-images/seated-row.jpg',
  '/exercise-images/seated-shoulder-press.jpg',
  '/exercise-images/seated-shrug.jpg',
  '/exercise-images/standing-1-leg-calf-raise.jpg',
  '/exercise-images/standing-barbell-shrug.jpg',
  '/exercise-images/standing-calf-raise.jpg',
  '/exercise-images/standing-shrug.jpg',
  '/exercise-images/standing-wrist-curl-with-extension.jpg',
  '/exercise-images/straight-bar-pushdown.jpg',
  '/exercise-images/v-bar-pushdown.jpg',
  '/exercise-images/wide-grip-pulldown.jpg',
];

/**
 * Cache the content-hashed bundles this build actually references.
 *
 * Their filenames change every build, so they cannot be listed statically.
 * They also cannot be left to be cached on demand: the page that triggers the
 * very first install fetches its own bundles *before* this worker controls
 * anything, so those requests never pass through `fetch` above and nothing
 * would be cached. The app would look fine until the first time it was opened
 * without signal, and then fail to boot.
 *
 * Reading the shell out of the cache avoids a second trip to the network.
 */
async function precacheBuildAssets(cache) {
  const shell = await cache.match(APP_SHELL, MATCH_OPTIONS);
  if (!shell) return;

  const html = await shell.text();
  const urls = Array.from(
    html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
    match => match[1]
  );
  await Promise.allSettled(urls.map(url => cache.add(url)));
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      await precacheBuildAssets(cache);
      // allSettled, not all: a single 404 here must not fail the install.
      await Promise.allSettled(EXERCISE_IMAGES.map(url => cache.add(url)));
    })()
  );
  // No skipWaiting — see the note at the top of this file.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Let a page promote a waiting worker.
 *
 * Nothing in the current index.html sends this. It exists so clients still
 * running the *previous* registration script — which posts SKIP_WAITING on
 * `updatefound` — can activate this worker immediately, instead of being
 * stranded on the old cache-first worker until every tab is closed. Without
 * it, the fix for "updates never arrive" could not itself arrive. It also
 * leaves room for an explicit "update now" control later.
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Leave cross-origin requests alone entirely.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

/**
 * Navigations: the network wins whenever it is reachable.
 *
 * This is what makes a deploy reachable at all. index.html references
 * content-hashed bundles, so serving it from cache pins the app to whichever
 * build happened to be installed first — precisely the bug this replaces.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Every route resolves to the same document, so keep one copy under the
      // shell key rather than one per URL the user happens to visit.
      cache.put(APP_SHELL, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(APP_SHELL, MATCH_OPTIONS)) ||
      (await cache.match('/', MATCH_OPTIONS)) ||
      Response.error()
    );
  }
}

/** Everything else: hashed bundles, icons and photos never change in place. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}
