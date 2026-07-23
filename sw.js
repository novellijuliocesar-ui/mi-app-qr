const CACHE_NAME = 'qr-cards-v3';
const BASE_PATH = '/mi-app-qr/';

const ASSETS_TO_CACHE = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'css/styles.css',
    BASE_PATH + 'js/app.js',
    BASE_PATH + 'js/excel-loader.js',
    BASE_PATH + 'js/qr-generator.js',
    BASE_PATH + 'js/card-renderer.js',
    BASE_PATH + 'js/utils.js',
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando assets para:', BASE_PATH);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.error('[SW] Error en install:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Eliminando cache antigua:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    if (event.request.url.includes('.xlsx')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                try {
                                    cache.put(event.request, responseToCache);
                                } catch (error) {
                                    console.warn('[SW] No se pudo cachear:', event.request.url);
                                }
                            });
                    }
                    return response;
                });
            })
            .catch(() => {
                return new Response('⚠️ Sin conexión', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});