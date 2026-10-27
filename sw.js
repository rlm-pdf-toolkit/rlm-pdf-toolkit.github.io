/* Service worker — lets the toolkit open without internet.
 * The page itself: network first, so a published update arrives; the saved
 * copy when offline. Libraries, icons and models never change within a
 * version, so they are served from the saved copy (fast, no data used).
 * Outside websites (the OCR engine) are left to the browser.
 * Raise VERSION with every release so phones pick up the new files. */
const VERSION = 'pdftoolkit-v4.1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'lib/pdf-lib.min.js', 'lib/pdf.min.js', 'lib/pdf.worker.min.js', 'lib/jszip.min.js', 'lib/tf.min.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];
/* Large and only needed for background removal: saved the first time they are used. */
const ON_USE = ['models/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

/* The page asks for this when the person taps "Update now". */
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter((k) => k.startsWith('pdftoolkit-') && k !== VERSION);
    /* keep the models already saved, so an update does not download them again */
    const now = await caches.open(VERSION);
    for (const k of old) {
      const c = await caches.open(k);
      for (const req of await c.keys()) {
        if (ON_USE.some((p) => new URL(req.url).pathname.includes('/' + p))) {
          const res = await c.match(req);
          if (res) await now.put(req, res);
        }
      }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

function isPage(req, url) {
  return req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (isPage(req, url)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return res; }
          return caches.match('index.html').then((r) => r || res);
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (ON_USE.some((p) => url.pathname.includes('/' + p)) || SHELL.some((s) => url.pathname.endsWith('/' + s)))) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
