// Página 2: búsqueda de repuestos en el almacén.
import { cargarStock, buscar, ordenCriticidad } from './data.js';
import { dibujarListado, fmtCantidad } from './render.js';
import { $, toast, escapeHtml, debounce, ListaPaginada, canvasABlob, descargar, compartirArchivo, compartirTexto } from './ui.js';

const ORDENES = {
    relevancia: null,
    ubicacion: (a, b) => a.ubicacion.localeCompare(b.ubicacion, 'es', { numeric: true }),
    referencia: (a, b) => a.referencia.localeCompare(b.referencia, 'es', { numeric: true }),
    cantidad: (a, b) => (a.cantidad ?? Infinity) - (b.cantidad ?? Infinity),
    criticidad: (a, b) => ordenCriticidad(a.criticidad) - ordenCriticidad(b.criticidad),
};

export class StockPage {
    constructor() {
        this.items = [];
        this.resultados = [];
        this.seleccion = new Set();   // registros seleccionados (no índices: sobrevive a reordenar)
        this.modoSeleccion = false;

        this.el = {
            info: $('#stockDataInfo'),
            search: $('#stockSearch'),
            clear: $('#stockSearchClear'),
            categoria: $('#stockCategory'),
            orden: $('#stockSort'),
            critica: $('#stockOnlyCritical'),
            toolbar: $('#stockToolbar'),
            count: $('#stockCount'),
            selectMode: $('#stockSelectMode'),
            list: $('#stockList'),
            empty: $('#stockEmpty'),
            exportBar: $('#stockExportBar'),
            exportLabel: $('#stockExportLabel'),
        };

        this.lista = new ListaPaginada(this.el.list, $('#stockMore'), (it, i) => this.renderItem(it, i));

        const buscarDebounced = debounce(() => this.buscar(), 200);
        this.el.search.addEventListener('input', () => {
            this.el.clear.hidden = !this.el.search.value;
            buscarDebounced();
        });
        this.el.search.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.el.search.blur();   // cierra el teclado para ver resultados
        });
        this.el.clear.addEventListener('click', () => {
            this.el.search.value = '';
            this.el.clear.hidden = true;
            this.buscar();
            this.el.search.focus();
        });
        for (const ctrl of [this.el.categoria, this.el.orden, this.el.critica]) {
            ctrl.addEventListener('change', () => this.buscar());
        }
        this.el.selectMode.addEventListener('click', () => this.alternarModoSeleccion());
        this.el.list.addEventListener('click', e => {
            const fila = e.target.closest('[data-i]');
            if (!fila) return;
            if (e.target.closest('.copy')) {
                this.copiarReferencia(this.resultados[+fila.dataset.i]);
            } else if (this.modoSeleccion) {
                this.alternarSeleccion(+fila.dataset.i, fila);
            }
        });
        $('#stockShareText').addEventListener('click', () => this.compartirTexto());
        $('#stockShareImg').addEventListener('click', () => this.exportarImagen(true));
        $('#stockDownloadImg').addEventListener('click', () => this.exportarImagen(false));
    }

    async cargar() {
        try {
            const { items, categorias, ultimaFecha } = await cargarStock();
            this.items = items;
            this.el.info.textContent = `${items.length.toLocaleString('es-ES')} ubicaciones`
                + (ultimaFecha ? ` · última modificación ${ultimaFecha}` : '');
            this.el.categoria.insertAdjacentHTML('beforeend',
                categorias.map(c => `<option>${escapeHtml(c)}</option>`).join(''));
            const ref = new URLSearchParams(location.search).get('ref');
            if (ref) {
                this.el.search.value = ref;
                this.el.clear.hidden = false;
                this.buscar();
            }
        } catch (e) {
            console.error(e);
            this.el.info.textContent = 'No se pudo cargar el almacén';
            this.el.empty.innerHTML = `<p class="error">⚠️ ${escapeHtml(e.message)}</p>
                <button class="btn btn-dark" onclick="location.reload()">Reintentar</button>`;
        }
    }

    get hayFiltro() {
        return this.el.search.value.trim() || this.el.categoria.value || this.el.critica.checked;
    }

    buscar() {
        const q = this.el.search.value.trim();
        const cat = this.el.categoria.value;
        const soloA = this.el.critica.checked;

        if (!this.hayFiltro) {
            this.resultados = [];
        } else {
            this.resultados = buscar(this.items, q,
                it => (!cat || it.clasificacion === cat) && (!soloA || it.criticidad === 'A'));
            const orden = ORDENES[this.el.orden.value];
            if (orden) this.resultados.sort(orden);
        }

        this.seleccion.clear();
        this.modoSeleccion = false;
        this.el.empty.hidden = !!this.hayFiltro;
        this.el.toolbar.hidden = !this.hayFiltro;
        this.lista.mostrar(this.resultados);
        this.actualizarContadores();
    }

    renderItem(it, i) {
        const sel = this.seleccion.has(it);
        const sinStock = it.cantidad === 0;
        return `
            <li class="stock-item${sel ? ' selected' : ''}${this.modoSeleccion ? ' selecting' : ''}" data-i="${i}">
                <span class="check" aria-hidden="true">${sel ? '✓' : ''}</span>
                <div class="stock-main">
                    <div class="item-top">
                        <button class="copy mono" title="Copiar referencia">${escapeHtml(it.referencia || '—')}</button>
                        ${it.criticidad ? `<span class="crit crit-${escapeHtml(it.criticidad)}" title="Criticidad">${escapeHtml(it.criticidad)}</span>` : ''}
                        <span class="qty${sinStock ? ' zero' : ''}">${escapeHtml(fmtCantidad(it))}</span>
                    </div>
                    <div class="item-desc">${escapeHtml(it.descripcion || '—')}</div>
                    <div class="item-meta">
                        <span class="loc mono">📍 ${escapeHtml(it.ubicacion || '—')}</span>
                        ${it.refFabricante ? `<span>Fab: ${escapeHtml(it.refFabricante)}</span>` : ''}
                        ${it.clasificacion ? `<span>${escapeHtml(it.clasificacion)}</span>` : ''}
                    </div>
                </div>
            </li>`;
    }

    actualizarContadores() {
        const n = this.resultados.length;
        const unidades = this.resultados.reduce((s, it) => s + (it.cantidad || 0), 0);
        this.el.count.textContent = n
            ? `${n.toLocaleString('es-ES')} resultado${n === 1 ? '' : 's'} · ${unidades.toLocaleString('es-ES')} uds. en total`
            : 'Sin resultados';
        this.el.selectMode.textContent = this.modoSeleccion ? '✕ Cancelar' : '☑ Seleccionar';
        this.el.selectMode.hidden = n === 0;
        this.el.exportBar.hidden = n === 0;
        this.el.exportLabel.textContent = this.seleccion.size
            ? `${this.seleccion.size} seleccionado${this.seleccion.size === 1 ? '' : 's'}`
            : this.modoSeleccion ? 'Toca para seleccionar' : `Todos (${n})`;
        document.body.classList.toggle('has-export-bar', n > 0);
    }

    alternarModoSeleccion() {
        this.modoSeleccion = !this.modoSeleccion;
        if (!this.modoSeleccion) this.seleccion.clear();
        this.lista.refrescar();
        this.actualizarContadores();
    }

    alternarSeleccion(i, fila) {
        const it = this.resultados[i];
        if (this.seleccion.has(it)) this.seleccion.delete(it);
        else this.seleccion.add(it);
        fila.classList.toggle('selected', this.seleccion.has(it));
        fila.querySelector('.check').textContent = this.seleccion.has(it) ? '✓' : '';
        this.actualizarContadores();
    }

    async copiarReferencia(it) {
        try {
            await navigator.clipboard.writeText(it.referencia);
            toast(`Referencia ${it.referencia} copiada`, 'success', 1500);
        } catch {
            toast('No se pudo copiar', 'error');
        }
    }

    /** Lo que se exporta: la selección si la hay; si no, todos los resultados. */
    get aExportar() {
        return this.seleccion.size
            ? this.resultados.filter(it => this.seleccion.has(it))
            : this.resultados;
    }

    get descripcionBusqueda() {
        const partes = [];
        if (this.el.search.value.trim()) partes.push(`"${this.el.search.value.trim()}"`);
        if (this.el.categoria.value) partes.push(this.el.categoria.value);
        if (this.el.critica.checked) partes.push('criticidad A');
        return partes.join(' · ');
    }

    async compartirTexto() {
        const items = this.aExportar;
        const lineas = items.slice(0, 100).map(it =>
            `• ${it.referencia} — ${it.descripcion}\n  📍 ${it.ubicacion} · ${fmtCantidad(it)}${it.criticidad ? ` · Crit. ${it.criticidad}` : ''}`);
        if (items.length > 100) lineas.push(`… y ${items.length - 100} más`);
        const texto = `📦 Stock${this.descripcionBusqueda ? ` (${this.descripcionBusqueda})` : ''}: ${items.length} resultado(s)\n\n${lineas.join('\n')}`;
        try {
            await compartirTexto(texto);
        } catch {
            toast('No se pudo compartir el texto', 'error');
        }
    }

    async exportarImagen(compartir) {
        const items = this.aExportar;
        const canvas = dibujarListado(items, {
            titulo: this.seleccion.size ? `Selección de repuestos (${items.length})` : `Stock: ${items.length} resultado(s)`,
            subtitulo: this.descripcionBusqueda || 'Todos los resultados',
        });
        const blob = await canvasABlob(canvas);
        const nombre = `stock-${new Date().toISOString().slice(0, 10)}.png`;
        try {
            if (compartir) await compartirArchivo(blob, nombre, `Stock: ${items.length} repuesto(s)`);
            else {
                descargar(blob, nombre);
                toast('Imagen descargada', 'success');
            }
        } catch {
            toast('No se pudo compartir la imagen', 'error');
        }
    }
}
