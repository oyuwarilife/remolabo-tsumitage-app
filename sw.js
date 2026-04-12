// Service Worker for PWA

const CACHE_NAME = 'remolabo-v17';
const urlsToCache = [
    './',
    './index.html',
    './about.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './assets/remonyan.png',
    './assets/remonyan-1.png',
    './assets/remonyan-2.png',
    './assets/remonyan-3.png',
    './assets/remonyan-4.png',
    './assets/remonyan-5.png'
];

// インストール
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// アクティベート
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// フェッチ
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
