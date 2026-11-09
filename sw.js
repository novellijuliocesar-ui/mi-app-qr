// Service worker: permite abrir la app sin conexión.
// - App (HTML, CSS, JS, librerías): se sirve desde caché y se actualiza al publicar una versión nueva.
// - Excel: siempre se intenta descargar el más reciente; sin conexión se usa la última copia guardada.
// Al cambiar cualquier archivo de la app, sube VERSION para que los móviles reciban la actualización.

const VERSION = 'v6';
const CACHE_APP = `qr-stock-app-${VERSION}`;
const CACHE_DATOS = 'qr-stock-datos';

const APP = [
    './',
    './index.html',
    './manifest.json',
    './css/app.css',
    './js/main.js',
    './js/ui.js',
    './js/data.js',
    './js/render.js',
    './js/qr-page.js',
    './js/stock-page.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_APP).then(c => c.addAll(APP)));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const nombres = await caches.keys();
        await Promise.all(nombres
            .filter(n => n !== CACHE_APP && n !== CACHE_DATOS)
            .map(n => caches.delete(n)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (url.pathname.endsWith('.xlsx')) {
        event.respondWith(redPrimero(request));
    } else {
        event.respondWith(cachePrimero(request));
    }
});

async function redPrimero(request) {
    const cache = await caches.open(CACHE_DATOS);
    try {
        const resp = await fetch(request);
        if (resp.ok) await cache.put(request, resp.clone());
        return resp;
    } catch {
        const guardada = await cache.match(request, { ignoreSearch: true });
        if (guardada) return guardada;
        throw new Error('Sin conexión y sin copia guardada');
    }
}

async function cachePrimero(request) {
    const guardada = await caches.match(request, { ignoreSearch: true });
    if (guardada) return guardada;
    const resp = await fetch(request);
    if (resp.ok && new URL(request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_APP);
        await cache.put(request, resp.clone());
    }
    return resp;
}
