// sw.js
const CACHE_NAME = 'pfd-cache-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './sw.js',
    './assets/css/style.css',
    './assets/js/main.js',
    './assets/js/pfd.js',
    './assets/js/sensors.js',
    './assets/js/sw-register.js',
    './assets/js/utils.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => (k !== CACHE_NAME) && caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(resp => {
                const copy = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return resp;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
