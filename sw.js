// Service worker: permite abrir la app sin conexión y con mala cobertura.
// - App (HTML, CSS, JS, librerías): se abre al instante desde la copia guardada y, a la vez,
//   se descarga la versión más reciente para la próxima vez.
// - Excel: se intenta descargar el más reciente; si no hay red o tarda más de unos segundos,
//   se usa la última copia guardada (la app avisa con "copia guardada").

const VERSION = 'v11';
const CACHE_APP = `qr-stock-app-${VERSION}`;
const CACHE_DATOS = 'qr-stock-datos';
const ESPERA_EXCEL_MS = 4000;

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
];
const LIBRERIAS = [
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.mini.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_APP);
        await cache.addAll(APP);
        // Las librerías externas se guardan por separado: si una falla, la app se instala igual.
        await Promise.allSettled(LIBRERIAS.map(url => cache.add(url)));
    })());
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
        event.respondWith(excel(event, request));
    } else if (url.origin === self.location.origin || LIBRERIAS.includes(request.url)) {
        event.respondWith(copiaYActualiza(event, request));
    }
});

/** Excel: red primero, con límite de espera; si falla, la copia guardada marcada como tal. */
async function excel(event, request) {
    const cache = await caches.open(CACHE_DATOS);
    const deRed = fetch(request).then(async resp => {
        if (resp.ok) await cache.put(request, resp.clone());
        return resp;
    });

    const guardada = await cache.match(request, { ignoreSearch: true });
    if (!guardada) return deRed;     // primera vez: hay que esperar a la red
    event.waitUntil(deRed.catch(() => {}));   // que termine de actualizarse aunque se use la copia

    const limite = new Promise(resolve => setTimeout(resolve, ESPERA_EXCEL_MS, null));
    const resp = await Promise.race([deRed.catch(() => null), limite]);
    if (resp && resp.ok) return resp;

    // Sin red o demasiado lenta: copia guardada (la red sigue actualizándola en segundo plano).
    const cabeceras = new Headers(guardada.headers);
    cabeceras.set('X-Copia-Guardada', '1');
    return new Response(await guardada.blob(), { status: 200, headers: cabeceras });
}

/** App: responde con la copia guardada al instante y la actualiza en segundo plano. */
async function copiaYActualiza(event, request) {
    const cache = await caches.open(CACHE_APP);
    const guardada = await cache.match(request, { ignoreSearch: true });
    const deRed = fetch(request).then(async resp => {
        if (resp.ok) await cache.put(request, resp.clone());
        return resp;
    });
    if (guardada) {
        event.waitUntil(deRed.catch(() => {}));
        return guardada;
    }
    return deRed;
}
