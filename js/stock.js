import { mostrarMensaje, debounce, sanitizarNombre } from './utils.js';

// ========== FUNCIÓN DE NORMALIZACIÓN DE TEXTO ==========

function normalizarTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========== GENERADOR DE IMAGEN DE RESULTADOS ==========

class ResultsRenderer {
    static async generarImagen(resultados, termino = '', categoria = '', pagina = 1, total = 0) {
        return new Promise((resolve, reject) => {
            try {
                if (!resultados || !Array.isArray(resultados) || resultados.length === 0) {
                    reject(new Error('No hay resultados para mostrar'));
                    return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const maxWidth = 800;
                const padding = 15;
                const rowHeight = 30;
                const headerHeight = 45;
                const titleHeight = 50;
                
                const resultsCount = Math.min(resultados.length, 30);
                const totalHeight = titleHeight + headerHeight + (resultsCount * rowHeight) + padding * 2 + 45;
                
                canvas.width = maxWidth;
                canvas.height = totalHeight;
                
                const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradiente.addColorStop(0, '#F2C200');
                gradiente.addColorStop(0.3, '#F5D530');
                gradiente.addColorStop(1, '#1a1a2e');
                ctx.fillStyle = gradiente;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                ResultsRenderer._dibujarRectRedondeado(ctx, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2, 16);
                ctx.fill();
                
                let y = padding + 10;
                
                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold 16px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('📦 Resultados de Búsqueda', canvas.width / 2, y + 16);
                y += 28;
                
                ctx.font = '11px "Segoe UI", sans-serif';
                ctx.fillStyle = '#666';
                let subtitulo = `🔍 ${total || resultados.length} resultados encontrados`;
                if (termino) subtitulo += ` - "${termino}"`;
                if (categoria) subtitulo += ` - ${categoria}`;
                if (total > resultados.length) subtitulo += ` (mostrando página ${pagina})`;
                ctx.fillText(subtitulo, canvas.width / 2, y + 10);
                y += 25;
                
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(padding + 12, y);
                ctx.lineTo(canvas.width - padding - 12, y);
                ctx.stroke();
                y += 8;
                
                ctx.fillStyle = '#1a1a2e';
                ctx.font = 'bold 10px "Courier New", monospace';
                ctx.textAlign = 'left';
                
                const textos = ['📍 Ubicación', 'Referencia', 'Descripción'];
                const xInicial = padding + 12;
                const colWidths = [200, 120, 420];
                
                let x = xInicial;
                textos.forEach((text, i) => {
                    ctx.fillStyle = i === 0 ? '#1a1a2e' : i === 1 ? '#F2C200' : '#1a1a2e';
                    ctx.fillText(text, x, y + 10);
                    x += colWidths[i];
                });
                y += 16;
                
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(xInicial, y - 4);
                ctx.lineTo(xInicial + colWidths.reduce((a, b) => a + b, 0), y - 4);
                ctx.stroke();
                
                const maxDisplay = Math.min(resultados.length, 30);
                ctx.font = '9px "Segoe UI", sans-serif';
                
                for (let i = 0; i < maxDisplay; i++) {
                    const item = resultados[i];
                    if (!item) continue;
                    
                    x = xInicial;
                    
                    ctx.fillStyle = '#333';
                    ctx.textAlign = 'left';
                    let texto = item.ubicacion || '—';
                    if (texto.length > 30) texto = texto.substring(0, 29) + '…';
                    ctx.fillText(texto, x, y + 9);
                    x += colWidths[0];
                    
                    ctx.fillStyle = '#1a1a2e';
                    ctx.font = 'bold 9px "Courier New", monospace';
                    texto = item.referencia || '—';
                    if (texto.length > 15) texto = texto.substring(0, 14) + '…';
                    ctx.fillText(texto, x, y + 9);
                    x += colWidths[1];
                    ctx.font = '9px "Segoe UI", sans-serif';
                    
                    ctx.fillStyle = '#333';
                    ctx.font = '9px "Segoe UI", sans-serif';
                    texto = item.descripcion || '—';
                    if (texto.length > 55) texto = texto.substring(0, 54) + '…';
                    ctx.fillText(texto, x, y + 9);
                    
                    y += rowHeight;
                }
                
                y += 8;
                ctx.fillStyle = 'rgba(26, 26, 46, 0.4)';
                ctx.font = '8px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                const fecha = new Date().toLocaleDateString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                const infoPagina = total > resultados.length ? ` · Página ${pagina}` : '';
                ctx.fillText(`Generado: ${fecha}${infoPagina} · mi-app-qr`, canvas.width / 2, y + 8);
                
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error('[ResultsRenderer] Error:', error);
                reject(error);
            }
        });
    }
    
    static _dibujarRectRedondeado(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// ========== DATOS DE EJEMPLO ==========

const DATOS_EJEMPLO = [
    {
        ubicacion: 'S1/A1/P1/H1/D1/F1',
        referencia: '45837',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS80M4BE2',
        clasificacion: 'MOTORES'
    },
    {
        ubicacion: 'S1/A1/P1/H1/D2/F1',
        referencia: '45838',
        descripcion: 'Motor-reductor engranaje. cilindricos R47DRS90M4BE2/Z',
        clasificacion: 'MOTORES'
    },
    {
        ubicacion: 'S1/A1/P1/H1/D4/F1',
        referencia: '21034',
        descripcion: 'MOTORREDUCTOR R67 DT90L4 1,5 KW 1410/27 REV/MIN',
        clasificacion: 'MOTORES'
    }
];

// ========== GESTOR DE REPUESTOS (STOCK) ==========

class StockLoader {
    constructor() {
        this.datos = [];
        this.filtrados = [];
        this.estaCargando = false;
        this.categorias = [];
        this.usaEjemplo = false;
        this.datosNormalizados = [];
    }

    async cargar(ruta = './data/Almacen.xlsx') {
        if (this.estaCargando) return;
        this.estaCargando = true;

        try {
            const rutas = [
                ruta,
                '/mi-app-qr/data/Almacen.xlsx',
                './data/Almacen.xlsx',
                'data/Almacen.xlsx',
                '../data/Almacen.xlsx'
            ];

            let dataCargada = null;

            for (const testRuta of rutas) {
                try {
                    console.log('[StockLoader] Probando ruta:', testRuta);
                    const response = await fetch(testRuta);
                    if (response.ok) {
                        const data = await response.arrayBuffer();
                        dataCargada = data;
                        console.log('[StockLoader] ✅ Cargado desde:', testRuta);
                        break;
                    }
                } catch (e) {
                    console.warn('[StockLoader] Falló ruta:', testRuta);
                }
            }

            if (!dataCargada) {
                console.warn('[StockLoader] ⚠️ No se pudo cargar el Excel. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this._normalizarDatos();
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel no encontrado)`, 'info', 5000);
                return this.datos;
            }

            const workbook = XLSX.read(dataCargada, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const filas = XLSX.utils.sheet_to_json(primeraHoja, { 
                defval: '',
                header: 1
            });

            console.log('[StockLoader] 📊 Total de filas en Excel:', filas.length);

            if (filas.length < 2) {
                console.warn('[StockLoader] ⚠️ El archivo tiene menos de 2 filas. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this._normalizarDatos();
                this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
                this.estaCargando = false;
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (archivo sin datos)`, 'info', 5000);
                return this.datos;
            }

            let cabeceras = null;
            let inicioDatos = 0;

            const primeraFila = filas[0] || [];
            const esTitulo = primeraFila.some(celda => 
                typeof celda === 'string' && 
                (celda.includes('Listado') || celda.includes('mapa') || celda.includes('almacén'))
            );

            if (esTitulo) {
                cabeceras = filas[1] || [];
                inicioDatos = 2;
                console.log('[StockLoader] 📋 Cabeceras encontradas en fila 2:', cabeceras);
            } else {
                cabeceras = filas[0] || [];
                inicioDatos = 1;
                console.log('[StockLoader] 📋 Cabeceras encontradas en fila 1:', cabeceras);
            }

            const idxUbicacion = cabeceras.indexOf('Ubicación');
            const idxReferencia = cabeceras.indexOf('Referencia');
            const idxDescripcion = cabeceras.indexOf('Descripción');
            const idxClasificacion = cabeceras.indexOf('Clasificación');

            this.datos = [];

            for (let i = inicioDatos; i < filas.length; i++) {
                const row = filas[i];
                if (!row || row.length === 0) continue;

                const ubicacion = idxUbicacion >= 0 ? String(row[idxUbicacion] || '').trim() : '';
                const referencia = idxReferencia >= 0 ? String(row[idxReferencia] || '').trim() : '';
                const descripcion = idxDescripcion >= 0 ? String(row[idxDescripcion] || '').trim() : '';
                const clasificacion = idxClasificacion >= 0 ? String(row[idxClasificacion] || '').trim() : '';

                if (referencia || descripcion) {
                    this.datos.push({
                        ubicacion: ubicacion || '—',
                        referencia: referencia || '—',
                        descripcion: descripcion || '—',
                        clasificacion: clasificacion || '—'
                    });
                }
            }

            if (this.datos.length === 0) {
                console.warn('[StockLoader] ⚠️ No se procesaron datos del Excel. Usando datos de ejemplo.');
                this.usaEjemplo = true;
                this.datos = [...DATOS_EJEMPLO];
                this._normalizarDatos();
                mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (Excel vacío)`, 'info', 5000);
            } else {
                this._normalizarDatos();
                console.log(`[StockLoader] ✅ ${this.datos.length} repuestos procesados desde Excel`);
                mostrarMensaje(`✅ ${this.datos.length} repuestos cargados`, 'success', 3000);
            }

            this.categorias = [...new Set(this.datos.map(item => item.clasificacion).filter(c => c && c !== '—'))].sort();
            this.estaCargando = false;
            return this.datos;

        } catch (error) {
            console.error('[StockLoader] ❌ Error:', error);
            this.usaEjemplo = true;
            this.datos = [...DATOS_EJEMPLO];
            this._normalizarDatos();
            this.categorias = [...new Set(this.datos.map(item => item.clasificacion))].sort();
            this.estaCargando = false;
            mostrarMensaje(`⚠️ Usando ${this.datos.length} datos de ejemplo (error: ${error.message})`, 'info', 5000);
            return this.datos;
        }
    }

    _normalizarDatos() {
        if (!this.datos || this.datos.length === 0) {
            this.datosNormalizados = [];
            return;
        }
        
        this.datosNormalizados = this.datos.map(item => ({
            ...item,
            _normalizado: {
                ubicacion: normalizarTexto(item.ubicacion || ''),
                referencia: normalizarTexto(item.referencia || ''),
                descripcion: normalizarTexto(item.descripcion || ''),
                clasificacion: normalizarTexto(item.clasificacion || ''),
                _original: { ...item }
            }
        }));
    }

    buscar(termino, categoria = '') {
        if (!this.datos || this.datos.length === 0) {
            this.filtrados = [];
            return [];
        }

        if (!this.datosNormalizados || this.datosNormalizados.length === 0) {
            this.filtrados = [];
            return [];
        }

        const busquedaNormalizada = normalizarTexto(termino);
        const categoriaNormalizada = normalizarTexto(categoria);

        console.log('[StockLoader] Buscando - término:', termino, 'categoría:', categoria);

        const resultados = this.datosNormalizados
            .filter(item => {
                const norm = item._normalizado;
                if (!norm) return false;

                if (busquedaNormalizada) {
                    const cumpleBusqueda = 
                        (norm.referencia || '').includes(busquedaNormalizada) ||
                        (norm.descripcion || '').includes(busquedaNormalizada) ||
                        (norm.ubicacion || '').includes(busquedaNormalizada);
                    if (!cumpleBusqueda) return false;
                }

                if (categoriaNormalizada) {
                    if ((norm.clasificacion || '') !== categoriaNormalizada) return false;
                }

                return true;
            })
            .map(item => {
                const original = item._original || item;
                return {
                    ubicacion: original.ubicacion || '—',
                    referencia: original.referencia || '—',
                    descripcion: original.descripcion || '—',
                    clasificacion: original.clasificacion || '—'
                };
            });

        this.filtrados = resultados;
        console.log(`[StockLoader] ✅ ${this.filtrados.length} resultados encontrados`);
        return this.filtrados;
    }

    obtenerDatos() {
        return this.filtrados;
    }

    obtenerCategorias() {
        return this.categorias;
    }
}

// ========== CONTROLADOR DE STOCK ==========

class StockApp {
    constructor() {
        this.loader = new StockLoader();
        this.datos = [];
        this.filtrados = [];
        this.terminoBusqueda = '';
        this.categoriaBusqueda = '';
        this.paginaActual = 1;
        this.resultadosPorPagina = 25;
        this.cachedImage = null;

        this.container = document.getElementById('stockPage');
        this.elements = {};
        this.messageEl = null;

        this.init();
    }

    async init() {
        this._buildUI();
        this._setupEventListeners();
        await this._cargarDatos();
        this._poblarFiltros();
    }

    _buildUI() {
        this.container.innerHTML = `
            <!-- ====== PANTALLA DE BÚSQUEDA ====== -->
            <div id="searchScreen" class="search-screen">
                <div class="stock-header">
                    <h1>🔧 Búsqueda de Repuestos</h1>
                    <p>Consulta el stock del almacén</p>
                </div>

                <div id="stockMessage" class="message" role="alert" aria-live="polite"></div>

                <div class="search-section">
                    <label for="stockSearchInput">🔍 Buscar</label>
                    <input 
                        type="text" 
                        id="stockSearchInput" 
                        placeholder="Buscar por referencia, descripción o ubicación..." 
                        autocomplete="off"
                    >
                </div>

                <div class="filters-section">
                    <div class="filter-group">
                        <label for="categoryFilter">🏷️ Clasificación</label>
                        <select id="categoryFilter">
                            <option value="">-- Todas --</option>
                        </select>
                    </div>
                </div>

                <button class="btn btn-primary" id="searchBtn">
                    🔍 Buscar Repuestos
                </button>
            </div>

            <!-- ====== PANTALLA DE RESULTADOS ====== -->
            <div id="resultsScreen" class="results-screen" style="display: none;">
                <div class="stock-header" style="text-align: center; padding: 15px;">
                    <h1 style="margin: 0; font-size: 1.2rem;">📊 Resultados de Búsqueda</h1>
                    <p id="resultsSubtitle" style="margin: 4px 0 0; font-size: 0.8rem;">0 resultados encontrados</p>
                </div>

                <div class="stock-table-container" id="tableContainer">
                    <div id="resultsTableWrapper" style="overflow-x: auto;">
                        <table class="stock-table" id="resultsTable">
                            <thead>
                                <tr>
                                    <th data-sort="ubicacion" style="cursor: pointer;">📍 Ubicación</th>
                                    <th data-sort="referencia" style="cursor: pointer;">Referencia</th>
                                    <th data-sort="descripcion" style="cursor: pointer;">Descripción</th>
                                </tr>
                            </thead>
                            <tbody id="resultsTableBody">
                                <tr>
                                    <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
                                        No hay resultados para mostrar
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Paginación -->
                    <div id="paginationControls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0; flex-wrap: wrap; gap: 8px;">
                        <span id="paginationInfo" style="font-size: 0.8rem; color: #666;">Mostrando 0 de 0</span>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn btn-small btn-back" id="prevPageBtn" style="padding: 4px 12px; font-size: 0.7rem; margin: 0;">◀ Anterior</button>
                            <span id="pageIndicator" style="font-size: 0.8rem; color: #333; display: flex; align-items: center; padding: 0 8px;">Página 1</span>
                            <button class="btn btn-small btn-back" id="nextPageBtn" style="padding: 4px 12px; font-size: 0.7rem; margin: 0;">Siguiente ▶</button>
                        </div>
                    </div>
                </div>

                <!-- ====== BOTONES DE ACCIÓN ====== -->
                <div class="action-buttons" id="actionButtons" style="margin-top: 16px; display: none;">
                    <button class="btn btn-secondary" id="downloadImageBtn">
                        📥 Descargar imagen
                    </button>
                    <button class="btn btn-success" id="shareImageBtn">
                        📤 Compartir imagen
                    </button>
                    <button class="btn btn-back" id="newSearchBtn">
                        ◀ Nueva búsqueda
                    </button>
                </div>
            </div>
        `;

        this.elements = {
            searchScreen: this.container.querySelector('#searchScreen'),
            resultsScreen: this.container.querySelector('#resultsScreen'),
            resultsSubtitle: this.container.querySelector('#resultsSubtitle'),
            resultsTableBody: this.container.querySelector('#resultsTableBody'),
            resultsTable: this.container.querySelector('#resultsTable'),
            searchInput: this.container.querySelector('#stockSearchInput'),
            categoryFilter: this.container.querySelector('#categoryFilter'),
            searchBtn: this.container.querySelector('#searchBtn'),
            prevPageBtn: this.container.querySelector('#prevPageBtn'),
            nextPageBtn: this.container.querySelector('#nextPageBtn'),
            pageIndicator: this.container.querySelector('#pageIndicator'),
            paginationInfo: this.container.querySelector('#paginationInfo'),
            downloadImageBtn: this.container.querySelector('#downloadImageBtn'),
            shareImageBtn: this.container.querySelector('#shareImageBtn'),
            newSearchBtn: this.container.querySelector('#newSearchBtn'),
            actionButtons: this.container.querySelector('#actionButtons'),
        };
        this.messageEl = this.container.querySelector('#stockMessage');
    }

    _setupEventListeners() {
        this.elements.searchBtn.addEventListener('click', () => this._buscar());
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this._buscar();
            }
        });
        this.elements.newSearchBtn.addEventListener('click', () => this._volver());
        this.elements.prevPageBtn.addEventListener('click', () => this._cambiarPagina(-1));
        this.elements.nextPageBtn.addEventListener('click', () => this._cambiarPagina(1));
        this.elements.downloadImageBtn.addEventListener('click', () => this._descargarImagen());
        this.elements.shareImageBtn.addEventListener('click', () => this._compartirImagen());

        this.elements.resultsTable.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                this._ordenarPor(key);
            });
        });

        console.log('[StockApp] Selector de categorías inicializado');
    }

    async _cargarDatos() {
        this._showMessage('📂 Cargando datos de repuestos...', 'info', 0);
        this.datos = await this.loader.cargar();
        if (this.loader.usaEjemplo) {
            this._showMessage(`⚠️ Usando datos de ejemplo (${this.datos.length} repuestos)`, 'info', 4000);
        }
        console.log('[StockApp] Categorías cargadas:', this.loader.obtenerCategorias());
    }

    _poblarFiltros() {
        const select = this.elements.categoryFilter;
        const categorias = this.loader.obtenerCategorias();
        
        console.log('[StockApp] Poblando filtros con categorías:', categorias);
        
        select.innerHTML = '<option value="">-- Todas --</option>';
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    }

    async _buscar() {
        const termino = this.elements.searchInput.value.trim();
        const categoria = this.elements.categoryFilter.value;

        console.log('[StockApp] 🔍 Buscando:', { termino, categoria });

        if (!termino && !categoria) {
            this._showMessage('⚠️ Introduce un término de búsqueda o selecciona una categoría', 'info', 3000);
            return;
        }

        this.terminoBusqueda = termino;
        this.categoriaBusqueda = categoria;

        this.filtrados = this.loader.buscar(termino, categoria);
        this.paginaActual = 1;
        this.cachedImage = null;

        console.log('[StockApp] Resultados encontrados:', this.filtrados.length);

        if (this.filtrados.length === 0) {
            this._showMessage(`🔍 No se encontraron resultados${termino ? ` para "${termino}"` : ''}${categoria ? ` en ${categoria}` : ''}`, 'info', 3000);
            this.elements.resultsScreen.style.display = 'block';
            this.elements.searchScreen.style.display = 'none';
            this.elements.resultsSubtitle.textContent = `🔍 0 resultados encontrados${termino ? ` para "${termino}"` : ''}${categoria ? ` en ${categoria}` : ''}`;
            this.elements.resultsTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
                        🔍 No se encontraron resultados
                        <br><span style="font-size: 0.8rem;">Prueba con otros términos de búsqueda</span>
                    </td>
                </tr>
            `;
            this.elements.paginationInfo.textContent = 'Mostrando 0 de 0';
            this.elements.pageIndicator.textContent = 'Página 1';
            this.elements.prevPageBtn.style.display = 'none';
            this.elements.nextPageBtn.style.display = 'none';
            this.elements.actionButtons.style.display = 'none';
            return;
        }

        this.elements.actionButtons.style.display = 'flex';
        await this._mostrarResultados();
    }

    async _mostrarResultados() {
        this.elements.searchScreen.style.display = 'none';
        this.elements.resultsScreen.style.display = 'block';
        this.elements.actionButtons.style.display = 'flex';

        this.elements.resultsSubtitle.textContent = 
            `🔍 ${this.filtrados.length} resultados encontrados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''}${this.categoriaBusqueda ? ` en ${this.categoriaBusqueda}` : ''}`;

        this._renderPagina();
        this._showMessage(`✅ ${this.filtrados.length} resultados encontrados`, 'success', 2000);
    }

    _renderPagina() {
        const total = this.filtrados.length;
        const porPagina = this.resultadosPorPagina;
        const totalPaginas = Math.ceil(total / porPagina);
        
        if (this.paginaActual > totalPaginas) {
            this.paginaActual = totalPaginas || 1;
        }
        
        const inicio = (this.paginaActual - 1) * porPagina;
        const fin = Math.min(inicio + porPagina, total);
        const paginaResultados = this.filtrados.slice(inicio, fin);

        const tbody = this.elements.resultsTableBody;
        
        if (paginaResultados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
                        No hay resultados en esta página
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = paginaResultados.map(item => {
                return `
                    <tr>
                        <td><code style="font-size: 0.7rem; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${item.ubicacion}</code></td>
                        <td><strong>${item.referencia}</strong></td>
                        <td>${item.descripcion}</td>
                    </tr>
                `;
            }).join('');
        }

        this.elements.paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${total} resultados`;
        this.elements.pageIndicator.textContent = `Página ${this.paginaActual} de ${totalPaginas || 1}`;
        
        this.elements.prevPageBtn.style.display = this.paginaActual > 1 ? 'inline-block' : 'none';
        this.elements.nextPageBtn.style.display = this.paginaActual < totalPaginas ? 'inline-block' : 'none';
        
        this.cachedImage = null;
    }

    _cambiarPagina(delta) {
        const total = this.filtrados.length;
        const totalPaginas = Math.ceil(total / this.resultadosPorPagina);
        const nuevaPagina = this.paginaActual + delta;
        
        if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
        
        this.paginaActual = nuevaPagina;
        this._renderPagina();
        
        const tableContainer = this.container.querySelector('#tableContainer');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    _ordenarPor(key) {
        if (this.filtrados.length === 0) return;
        
        if (this._ultimaOrden === key) {
            this._ordenAscendente = !this._ordenAscendente;
        } else {
            this._ultimaOrden = key;
            this._ordenAscendente = true;
        }
        
        const asc = this._ordenAscendente;
        
        this.filtrados.sort((a, b) => {
            let valA = a[key] || '';
            let valB = b[key] || '';
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return asc ? -1 : 1;
            if (valA > valB) return asc ? 1 : -1;
            return 0;
        });
        
        this.paginaActual = 1;
        this.cachedImage = null;
        this._renderPagina();
        
        this.elements.resultsTable.querySelectorAll('th[data-sort]').forEach(th => {
            th.style.color = th.dataset.sort === key ? '#F2C200' : '';
        });
    }

    async _generarImagen() {
        const total = this.filtrados.length;
        const porPagina = this.resultadosPorPagina;
        const inicio = (this.paginaActual - 1) * porPagina;
        const fin = Math.min(inicio + porPagina, total);
        const paginaResultados = this.filtrados.slice(inicio, fin);

        if (paginaResultados.length === 0) {
            this._showMessage('⚠️ No hay datos en esta página para generar imagen', 'info', 3000);
            return null;
        }

        try {
            const imageData = await ResultsRenderer.generarImagen(
                paginaResultados,
                this.terminoBusqueda,
                this.categoriaBusqueda,
                this.paginaActual,
                total
            );
            return imageData;
        } catch (error) {
            console.error('[StockApp] Error generando imagen:', error);
            this._showMessage('❌ Error al generar la imagen', 'error', 3000);
            return null;
        }
    }

    async _descargarImagen() {
        if (this.filtrados.length === 0) {
            this._showMessage('⚠️ No hay resultados para descargar', 'info', 3000);
            return;
        }

        this._showMessage('🖼️ Generando imagen...', 'info', 0);

        const imageData = await this._generarImagen();
        if (!imageData) {
            this._showMessage('❌ Error al generar la imagen', 'error', 3000);
            return;
        }

        try {
            const link = document.createElement('a');
            const fecha = new Date().toISOString().slice(0, 10);
            link.download = `stock-pagina-${this.paginaActual}-${fecha}.png`;
            link.href = imageData;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this._showMessage('📥 Imagen descargada', 'success', 2000);
        } catch (error) {
            console.error('[StockApp] Error descargando:', error);
            this._showMessage('❌ Error al descargar', 'error', 3000);
        }
    }

    async _compartirImagen() {
        if (this.filtrados.length === 0) {
            this._showMessage('⚠️ No hay resultados para compartir', 'info', 3000);
            return;
        }

        this._showMessage('🖼️ Generando imagen...', 'info', 0);

        const imageData = await this._generarImagen();
        if (!imageData) {
            this._showMessage('❌ Error al generar la imagen', 'error', 3000);
            return;
        }

        try {
            const blob = await (await fetch(imageData)).blob();
            const file = new File([blob], 'stock-resultados.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: 'Resultados de stock',
                    text: `📦 ${this.filtrados.length} repuestos encontrados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''} (Página ${this.paginaActual})`,
                    files: [file]
                });
                this._showMessage('📤 Compartido correctamente', 'success', 2000);
            } else {
                this._showMessage('📱 Compartir no soportado, se descargará', 'info', 2000);
                this._descargarImagen();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[StockApp] Error compartiendo:', error);
                this._showMessage('❌ Error al compartir', 'error', 3000);
            }
        }
    }

    _volver() {
        // Limpiar los campos de búsqueda
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.value = '';
        }
        
        // Ocultar resultados y mostrar búsqueda
        this.elements.resultsScreen.style.display = 'none';
        this.elements.searchScreen.style.display = 'block';
        
        // Limpiar datos de resultados
        this.filtrados = [];
        this.paginaActual = 1;
        this.cachedImage = null;
        this._ultimaOrden = null;
        this._ordenAscendente = true;
        this.elements.actionButtons.style.display = 'none';
        this.terminoBusqueda = '';
        this.categoriaBusqueda = '';
        
        // Limpiar mensajes
        this._showMessage('🔄 Campos limpiados. Realiza una nueva búsqueda.', 'info', 2000);
    }

    _showMessage(texto, tipo = 'info', duration = 3000) {
        if (!this.messageEl) return;
        this.messageEl.textContent = texto;
        this.messageEl.className = `message message-${tipo}`;
        this.messageEl.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                this.messageEl.style.display = 'none';
            }, duration);
        }
    }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.stockApp = new StockApp();
    }, 150);
});