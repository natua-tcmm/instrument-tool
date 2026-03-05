// sw.js
const CACHE_NAME = 'pfd-cache-v5';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './sw.js',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-192-maskable.png',
    './assets/icons/icon-512-maskable.png',
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

    const request = event.request;
    const url = new URL(request.url);

    event.respondWith(
        fetch(request)
            .then(resp => {
                if (url.origin === self.location.origin && resp.ok) {
                    const copy = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return resp;
            })
            .catch(async () => {
                const cached = await caches.match(request);
                if (cached) return cached;

                if (request.mode === 'navigate') {
                    const fallback = await caches.match('./index.html');
                    if (fallback) return fallback;
                }

                throw new Error('Network error and no cache available');
            })
    );
});
