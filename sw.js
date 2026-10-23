/* Offline support: network first, falling back to the last cached copy, so
   updates show up immediately when online and the course still opens offline.
   Installing caches the page and every file it loads, so this already works
   after the first visit (the page's own first requests come before the worker). */
const CACHE = "nihongo-ippo-v6";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        const page = await fetch("./", { cache: "no-cache" });
        if (!page.ok) return;
        const html = await page.clone().text();
        await cache.put("./", page);
        // Same-origin files the page references: scripts, stylesheet, icon, manifest.
        const files = Array.from(html.matchAll(/(?:src|href)="([^"#:]+)"/g), (m) => m[1]);
        await Promise.all(files.map((f) => cache.add(new Request(f, { cache: "no-cache" })).catch(() => {})));
      })
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!own && !fonts) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./") : undefined)))
  );
});
