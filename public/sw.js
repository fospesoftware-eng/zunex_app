/* ZUNEX service worker — app-shell caching for installability + offline shell.
   Strategy:
   - Navigations: network-first, cached shell fallback when offline.
   - Static assets (/_next/static, /brand): cache-first with background fill.
   - API / SSE / non-GET: never touched.
*/

const CACHE = "zunex-shell-v5";
const CORE = [
  "/",
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

  // Static, immutable content — cache first, fill cache on miss.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
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

  // Page navigations — network first; fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put("/", copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("/").then((shell) => shell || caches.match(req)))
    );
  }
});
