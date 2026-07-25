// ========== SERVICE WORKER ==========
// Versión: v4 - Soporte para QR Generator + Stock Search

const CACHE_NAME = 'qr-stock-app-v4';
const BASE_PATH = '/mi-app-qr/';

// ===== ASSETS PARA CACHEAR =====
const ASSETS_TO_CACHE = [
    // HTML
    BASE_PATH,
    BASE_PATH + 'index.html',
    
    // Manifest
    BASE_PATH + 'manifest.json',
    
    // CSS
    BASE_PATH + 'css/styles.css',
    BASE_PATH + 'css/stock.css',
    
    // JavaScript - Core
    BASE_PATH + 'js/app.js',
    BASE_PATH + 'js/stock.js',
    BASE_PATH + 'js/navigation.js',
    BASE_PATH + 'js/excel-loader.js',
    BASE_PATH + 'js/qr-generator.js',
    BASE_PATH + 'js/card-renderer.js',
    BASE_PATH + 'js/utils.js',
    
    // Librerías externas (CDN)
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'
];

// ===== INSTALACIÓN =====
self.addEventListener('install', event => {
    console.log('[SW] Instalando nueva versión:', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando assets...');
                return cache.addAll(ASSETS_TO_CACHE)
                    .then(() => {
                        console.log('[SW] ✅ Todos los assets cacheados correctamente');
                    })
                    .catch(err => {
                        console.error('[SW] ❌ Error al cachear algunos assets:', err);
                        return Promise.allSettled(
                            ASSETS_TO_CACHE.map(url => 
                                cache.add(url).catch(e => 
                                    console.warn('[SW] No se pudo cachear:', url, e)
                                )
                            )
                        );
                    });
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// ===== ACTIVACIÓN =====
self.addEventListener('activate', event => {
    console.log('[SW] Activando nueva versión:', CACHE_NAME);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                const deletePromises = cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Eliminando caché antigua:', name);
                        return caches.delete(name);
                    });
                return Promise.all(deletePromises);
            })
            .then(() => {
                console.log('[SW] ✅ Cachés antiguas eliminadas');
                return self.clients.claim();
            })
    );
});

// ===== INTERCEPTACIÓN DE PETICIONES (FETCH) =====
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 1. Archivos Excel - Network First
    if (url.pathname.endsWith('.xlsx') || url.pathname.includes('.xlsx')) {
        console.log('[SW] 📊 Excel detectado, usando Network First');
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    // 2. Archivos estáticos de la app - Cache First
    if (ASSETS_TO_CACHE.some(asset => url.pathname.includes(asset))) {
        console.log('[SW] 📦 Asset estático, usando Cache First');
        event.respondWith(cacheFirstStrategy(event.request));
        return;
    }
    
    // 3. Librerías CDN - Cache First
    if (url.hostname.includes('cdn.') || url.hostname.includes('cdnjs')) {
        console.log('[SW] 📚 Librería CDN, usando Cache First');
        event.respondWith(cacheFirstStrategy(event.request));
        return;
    }
    
    // 4. Iconos - Cache First
    if (url.pathname.includes('/icons/')) {
        console.log('[SW] 🖼️ Icono, usando Cache First');
        event.respondWith(cacheFirstStrategy(event.request));
        return;
    }
    
    // 5. Todo lo demás - Stale While Revalidate
    console.log('[SW] 🌐 Petición genérica, usando Stale While Revalidate');
    event.respondWith(staleWhileRevalidateStrategy(event.request));
});

// ===== ESTRATEGIAS DE CACHÉ =====

async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] ✅ Cache hit:', request.url);
            return cachedResponse;
        }
        
        console.log('[SW] ⚠️ Cache miss, yendo a red:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log('[SW] 💾 Guardado en caché:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] ❌ Error en Cache First:', error);
        return new Response('⚠️ Recurso no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

async function networkFirstStrategy(request) {
    try {
        console.log('[SW] 🌐 Network First para:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log('[SW] 💾 Actualizado caché desde red:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] ⚠️ Red falló, buscando en caché:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            console.log('[SW] ✅ Cache hit (fallback):', request.url);
            return cachedResponse;
        }
        
        console.error('[SW] ❌ No hay caché ni red para:', request.url);
        return new Response('⚠️ No se pudo cargar el recurso', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

async function staleWhileRevalidateStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        
        const fetchPromise = fetch(request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, networkResponse.clone());
                            console.log('[SW] 💾 Actualizado caché:', request.url);
                        })
                        .catch(err => console.warn('[SW] Error al guardar en caché:', err));
                }
                return networkResponse;
            })
            .catch(err => {
                console.warn('[SW] Error en fetch:', err);
                return null;
            });
        
        if (cachedResponse) {
            console.log('[SW] ✅ Cache hit (stale):', request.url);
            fetchPromise.catch(() => {});
            return cachedResponse;
        }
        
        console.log('[SW] ⚠️ No hay caché, esperando red:', request.url);
        const networkResponse = await fetchPromise;
        if (networkResponse) {
            return networkResponse;
        }
        
        console.error('[SW] ❌ No hay caché ni red para:', request.url);
        return new Response('⚠️ Recurso no disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    } catch (error) {
        console.error('[SW] ❌ Error en Stale While Revalidate:', error);
        return new Response('⚠️ Error al cargar el recurso', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// ===== EVENTO DE MENSAJE =====
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Recibida solicitud de salto de espera');
        self.skipWaiting();
    }
});

// ===== MANEJO DE ERRORES =====
self.addEventListener('error', event => {
    console.error('[SW] Error global:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Promesa rechazada no manejada:', event.reason);
});

console.log('[SW] Service Worker cargado correctamente');
