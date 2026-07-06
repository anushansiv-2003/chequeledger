const CACHE = 'bankbook-v2';
const ASSETS = [
  './app.html',
  './manifest.json'
];

// Install — cache only core assets, skip external CDN files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // force activate immediately
  );
});

// Activate — delete ALL old caches, claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim()) // take control of all open tabs/windows
      .then(() => {
        // Tell all clients to reload
        return self.clients.matchAll({type:'window'}).then(clients => {
          clients.forEach(client => client.postMessage({type:'SW_UPDATED'}));
        });
      })
  );
});

// Fetch — network first for app.html, cache fallback for others
self.addEventListener('fetch', e => {
  // Always skip Firebase API calls
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('identitytoolkit') ||
      e.request.url.includes('securetoken') ||
      e.request.url.includes('googleapis.com')) {
    return;
  }

  // Network first for app.html so updates always come through
  if (e.request.url.endsWith('app.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./app.html'))
    );
    return;
  }

  // Cache first for everything else
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
