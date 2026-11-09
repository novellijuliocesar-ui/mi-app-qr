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
pages.addEventListener('scroll', () => {
    marcarPestana(Math.round(pages.scrollLeft / pages.clientWidth));
}, { passive: true });

// Abrir directamente en stock con ?ref=… o #stock
if (new URLSearchParams(location.search).has('ref') || location.hash === '#stock') {
    requestAnimationFrame(() => irA(1, false));
}
marcarPestana(0);

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
