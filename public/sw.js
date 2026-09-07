/* ZUNEX service worker — minimal, staleness-proof app shell.
   Strategy:
   - Page navigations: NEVER intercepted → always fresh HTML from network.
     (A stale HTML shell referencing old chunk hashes was causing stuck/
      outdated bundles; the app needs its API anyway, so no offline shell.)
   - /_next/static/*: cache-first (content-hashed, immutable).
   - /brand/*: stale-while-revalidate (serve fast, refresh in background).
   - API / SSE / non-GET: never touched.
   Bumping CACHE purges every older cache on activation.
*/

const CACHE = "zunex-shell-v6";
const CORE = [
  "/manifest.webmanifest",
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/brand/icon-maskable-192.png",
  "/brand/icon-maskable-512.png",
  "/brand/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Immutable, content-hashed build output — cache first, fill on miss.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches
                  .open(CACHE)
                  .then((c) => c.put(req, copy))
                  .catch(() => {});
              }
              return res;
            })
            .catch(() => hit)
      )
    );
    return;
  }

  // Brand assets (not hashed) — stale-while-revalidate so icon/logo updates
  // reach installed clients without waiting for a cache version bump.
  if (url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches
                .open(CACHE)
                .then((c) => c.put(req, copy))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    );
    return;
  }

  // Everything else (page navigations, sw.js itself, manifest edge cases):
  // plain network — never serve a cached page.
});
