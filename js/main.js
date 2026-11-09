// Punto de entrada: navegación entre páginas, carga de datos y modo sin conexión.
import { QrPage } from './qr-page.js';
import { StockPage } from './stock-page.js';
import { $ } from './ui.js';

const pages = $('#pages');
const tabs = [...document.querySelectorAll('.tab')];

// ---------- Navegación: pestañas + deslizar (scroll-snap nativo) ----------
function irA(indice, suave = true) {
    pages.scrollTo({ left: indice * pages.clientWidth, behavior: suave ? 'smooth' : 'instant' });
}

function marcarPestana(indice) {
    tabs.forEach((t, i) => {
        t.classList.toggle('active', i === indice);
        if (i === indice) t.setAttribute('aria-current', 'page');
        else t.removeAttribute('aria-current');
    });
    document.body.dataset.page = indice;
}

tabs.forEach((t, i) => t.addEventListener('click', () => irA(i)));
let paginaActual = 0;
pages.addEventListener('scroll', () => {
    paginaActual = Math.round(pages.scrollLeft / pages.clientWidth);
    marcarPestana(paginaActual);
}, { passive: true });
// Al girar el móvil o cambiar el tamaño, se queda en la misma página.
window.addEventListener('resize', () => irA(paginaActual, false));

// Abrir directamente en stock con ?ref=… o #stock
if (new URLSearchParams(location.search).has('ref') || location.hash === '#stock') {
    requestAnimationFrame(() => irA(1, false));
}
marcarPestana(0);

// ---------- Tema claro / oscuro ----------
// Por defecto sigue el tema del sistema; el botón 🌓 lo cambia y la elección se recuerda.
const oscuroSistema = matchMedia('(prefers-color-scheme: dark)');
function temaActual() {
    return document.documentElement.dataset.theme || (oscuroSistema.matches ? 'dark' : 'light');
}
document.querySelectorAll('.theme-btn').forEach(btn => btn.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nuevo;
    try { localStorage.setItem('tema', nuevo); } catch { /* sin almacenamiento: dura hasta cerrar */ }
}));

// ---------- Datos ----------
const qr = new QrPage();
const stock = new StockPage();
qr.cargar();
stock.cargar();

// ---------- Modo sin conexión (service worker) ----------
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
        const avisar = sw => {
            $('#updateBanner').hidden = false;
            $('#updateBtn').onclick = () => sw.postMessage('SKIP_WAITING');
        };
        if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
        reg.addEventListener('updatefound', () => {
            const nuevo = reg.installing;
            nuevo.addEventListener('statechange', () => {
                if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisar(nuevo);
            });
        });
    }).catch(e => console.warn('Service worker no registrado:', e));

    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!recargando) {
            recargando = true;
            location.reload();
        }
    });
}
