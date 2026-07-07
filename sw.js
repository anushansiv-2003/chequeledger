// Bank Book Service Worker — v3
// Network-first with HTTP-cache bypass so GitHub Pages updates show immediately
const CACHE = 'bankbook-v3';
const ASSETS = ['./app.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type: 'window'}))
      .then(clients => clients.forEach(c => c.postMessage({type: 'SW_UPDATED'})))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept Firebase / Google APIs
  if (url.includes('googleapis.com') || url.includes('gstatic.com') ||
      url.includes('identitytoolkit') || url.includes('securetoken')) return;

  // App shell: network first, BYPASSING HTTP cache (cache:'reload')
  if (url.endsWith('app.html') || url.endsWith('/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(e.request, {cache: 'reload'}))
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('./app.html', clone));
          return res;
        })
        .catch(() => caches.match('./app.html'))
    );
    return;
  }

  // Everything else: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
