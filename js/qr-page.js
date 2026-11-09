// Página 1: buscar un activo y generar su tarjeta QR.
import { cargarActivos, buscar } from './data.js';
import { dibujarTarjeta } from './render.js';
import { $, toast, escapeHtml, debounce, ListaPaginada, canvasABlob, descargar, compartirArchivo, nombreArchivo } from './ui.js';

export class QrPage {
    constructor() {
        this.activos = [];
        this.resultados = [];
        this.actual = null;
        this.blob = null;

        this.el = {
            info: $('#qrDataInfo'),
            search: $('#qrSearch'),
            clear: $('#qrSearchClear'),
            count: $('#qrCount'),
            list: $('#qrList'),
            searchView: $('#qrSearchView'),
            cardView: $('#qrCardView'),
            img: $('#qrCardImg'),
        };

        this.lista = new ListaPaginada(this.el.list, $('#qrMore'), (it, i) => `
            <li><button class="item" data-i="${i}">
                <span class="item-top"><b class="mono">${escapeHtml(it.codigo)}</b><span class="badge">${escapeHtml(it.id)}</span></span>
                <span class="item-desc">${escapeHtml(it.desc)}</span>
            </button></li>`);

        const buscarDebounced = debounce(() => this.buscar(), 150);
        this.el.search.addEventListener('input', () => {
            this.el.clear.hidden = !this.el.search.value;
            buscarDebounced();
        });
        this.el.search.addEventListener('keydown', e => {
            // Enter con un único resultado (o coincidencia exacta) genera la tarjeta directamente.
            if (e.key === 'Enter' && this.resultados.length) {
                const exacto = this.resultados.find(it => it.id === this.el.search.value.trim());
                if (exacto || this.resultados.length === 1) this.generar(exacto || this.resultados[0]);
            }
        });
        this.el.clear.addEventListener('click', () => {
            this.el.search.value = '';
            this.el.clear.hidden = true;
            this.buscar();
            this.el.search.focus();
        });
        this.el.list.addEventListener('click', e => {
            const btn = e.target.closest('[data-i]');
            if (btn) this.generar(this.resultados[+btn.dataset.i]);
        });
        $('#qrBack').addEventListener('click', () => this.volver());
        $('#qrDownload').addEventListener('click', () => this.descargar());
        $('#qrShare').addEventListener('click', () => this.compartir());
    }

    async cargar() {
        try {
            const { items } = await cargarActivos();
            this.activos = items;
            this.el.info.textContent = `${items.length.toLocaleString('es-ES')} activos`;
            this.buscar();
            this.abrirDesdeEnlace();
        } catch (e) {
            console.error(e);
            this.el.info.textContent = 'No se pudieron cargar los activos';
            this.el.count.innerHTML = `<span class="error">⚠️ ${escapeHtml(e.message)}</span>
                <button class="btn-chip" onclick="location.reload()">Reintentar</button>`;
        }
    }

    /** Permite abrir la app con ?activo=162514 (por ejemplo, desde un enlace compartido). */
    abrirDesdeEnlace() {
        const id = new URLSearchParams(location.search).get('activo');
        const it = id && this.activos.find(a => a.id === id);
        if (it) this.generar(it);
    }

    buscar() {
        const q = this.el.search.value.trim();
        // Sin texto no se lista nada: los activos aparecen a medida que se escribe.
        this.resultados = q ? buscar(this.activos, q) : [];
        this.el.count.textContent = q
            ? (this.resultados.length ? `${this.resultados.length} resultado${this.resultados.length === 1 ? '' : 's'}` : 'Sin resultados')
            : 'Escribe un ID, código o descripción para buscar';
        this.lista.mostrar(this.resultados);
    }

    async generar(it) {
        this.actual = it;
        try {
            const canvas = await dibujarTarjeta(it);
            this.blob = await canvasABlob(canvas);
            this.el.img.src = canvas.toDataURL('image/png');
            this.el.searchView.hidden = true;
            this.el.cardView.hidden = false;
            this.el.search.blur();
            document.getElementById('qrPage').scrollTo({ top: 0 });
        } catch (e) {
            console.error(e);
            toast(`No se pudo generar la tarjeta: ${e.message}`, 'error', 4000);
        }
    }

    volver() {
        this.el.cardView.hidden = true;
        this.el.searchView.hidden = false;
    }

    get nombre() {
        return `tarjeta-${nombreArchivo(this.actual.id)}-${nombreArchivo(this.actual.codigo)}.png`;
    }

    descargar() {
        descargar(this.blob, this.nombre);
        toast('Tarjeta descargada', 'success');
    }

    async compartir() {
        try {
            await compartirArchivo(this.blob, this.nombre, `${this.actual.id} · ${this.actual.codigo}`);
        } catch (e) {
            toast('No se pudo compartir', 'error');
        }
    }
}
