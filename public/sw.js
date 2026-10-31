/* Deadline Radar service worker.
 * - HTML: network first (new deploys appear fast), offline falls back to cached shell.
 * - Hashed assets & static files: cache first (immutable by filename).
 * - Cross-origin calls (the AI API) are never touched here.
 */
const CACHE = 'deadline-radar-v5'
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // `cache: 'no-cache'` asks GitHub Pages for a fresh document every time —
    // without it a phone's HTTP cache can keep serving an old index.html (and
    // its old hashed bundle) long after a new deploy, which is exactly how the
    // demo link ends up looking stale while localhost is already updated.
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return res
        }),
    ),
  )
})
