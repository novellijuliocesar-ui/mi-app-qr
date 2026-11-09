// Página 1: buscar un activo y generar su tarjeta QR.
import { cargarActivos, buscar } from './data.js';
import { dibujarTarjeta } from './render.js';
import { $, toast, escapeHtml, debounce, ListaPaginada, canvasABlob, descargar, compartirArchivo, nombreArchivo, abrirCapa, cerrarCapa } from './ui.js';

export class QrPage {
    constructor() {
        this.activos = [];
        this.resultados = [];
        this.actual = null;
        this.blob = null;
        this.generando = 0;           // evita que una tarjeta lenta sustituya a otra más reciente
        this.porIdExacto = false;     // la tarjeta abierta salió de escribir un ID completo

        this.el = {
            info: $('#qrDataInfo'),
            search: $('#qrSearch'),
            clear: $('#qrSearchClear'),
            count: $('#qrCount'),
            list: $('#qrList'),
            todos: $('#qrAll'),
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
        this.el.todos.addEventListener('change', () => {
            const it = this.activos[+this.el.todos.value];
            if (this.el.todos.value !== '' && it) this.generar(it);
        });
        $('#qrBack').addEventListener('click', () => cerrarCapa());
        $('#qrDownload').addEventListener('click', () => this.descargar());
        $('#qrShare').addEventListener('click', () => this.compartir());
    }

    async cargar() {
        try {
            const { items, copiaGuardada } = await cargarActivos();
            this.activos = items;
            this.el.info.textContent = `${items.length.toLocaleString('es-ES')} activos`
                + (copiaGuardada ? ' · sin conexión (copia guardada)' : '');
            this.rellenarDesplegable();
            this.buscar();
            this.abrirDesdeEnlace();
        } catch (e) {
            console.error(e);
            this.el.info.textContent = 'No se pudieron cargar los activos';
            this.el.todos.hidden = true;
            this.el.count.innerHTML = `<span class="error">⚠️ ${escapeHtml(e.message)}</span>
                <button class="btn-chip" onclick="location.reload()">Reintentar</button>`;
        }
    }

    /** Desplegable con todos los activos, para elegir sin escribir. */
    rellenarDesplegable() {
        const corto = t => (t.length > 45 ? `${t.slice(0, 44)}…` : t);
        this.el.todos.innerHTML = `<option value="">📋 O elige de la lista completa (${this.activos.length.toLocaleString('es-ES')})</option>`
            + this.activos.map((it, i) =>
                `<option value="${i}">${escapeHtml(`${it.codigo} · ${it.id} — ${corto(it.desc)}`)}</option>`).join('');
        this.el.todos.disabled = false;
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
        // El desplegable solo se muestra mientras no se ha escrito nada.
        this.el.todos.hidden = !!q;

        // Si lo escrito es un ID completo, genera la tarjeta sin tener que tocarla.
        // (Si el ID está repetido en el Excel, se deja elegir de la lista.)
        const exactos = this.activos.filter(it => it.id === q);
        if (exactos.length === 1) this.generar(exactos[0], true);
    }

    async generar(it, porIdExacto = false) {
        const turno = ++this.generando;
        try {
            const canvas = await dibujarTarjeta(it);
            const blob = await canvasABlob(canvas);
            if (turno !== this.generando) return;
            this.actual = it;
            this.blob = blob;
            this.porIdExacto = porIdExacto;
            this.el.img.src = URL.createObjectURL(blob);
            if (this.el.cardView.hidden) abrirCapa(() => this.cerrarTarjeta());
            this.el.searchView.hidden = true;
            this.el.cardView.hidden = false;
            this.el.search.blur();
            document.getElementById('qrPage').scrollTo({ top: 0 });
        } catch (e) {
            console.error(e);
            toast(`No se pudo generar la tarjeta: ${e.message}`, 'error', 4000);
        }
    }

    /** Vuelve a la búsqueda (con el botón o con «atrás» del móvil). */
    cerrarTarjeta() {
        URL.revokeObjectURL(this.el.img.src);
        this.el.todos.value = '';
        // Tras una tarjeta generada escribiendo el ID, el buscador queda listo para el siguiente.
        if (this.porIdExacto) {
            this.el.search.value = '';
            this.el.clear.hidden = true;
            this.buscar();
        }
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
