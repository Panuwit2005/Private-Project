// Offline support: precache the app shell, then serve same-origin files from cache
// while refreshing them in the background (stale-while-revalidate).
// Bump VERSION whenever files change so clients pick up the new set.
const VERSION = "lumiere-v4";
const SHELL = [
  "./", "index.html", "style-guide.html", "css/tokens.css", "css/app.css", "manifest.webmanifest",
  "js/app.js", "js/main.js",
  "js/tools/creator.js", "js/tools/invest.js", "js/tools/image.js", "js/tools/media.js", "js/tools/docs.js", "js/tools/text.js",
  "js/tools/dev.js", "js/tools/calc.js", "js/tools/daily.js",
  "vendor/lame.min.js", "vendor/jspdf.umd.min.js", "vendor/qrcode.js",
  "vendor/pdf-lib.min.js", "vendor/jsQR.js", "vendor/marked.min.js",
  "vendor/pdf.min.js", "vendor/pdf.worker.min.js",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
