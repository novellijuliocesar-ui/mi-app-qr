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
        this._ultimaOrden = null;
        this._ordenAscendente = true;

        this.container = document.getElementById('stockPage');
        this.elements = {};
        this.messageEl = null;

        this.init();
    }

    async init() {
        this._buildUI();
        await this._cargarDatos();
        this._poblarFiltros();
        this._setupEventListeners();
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
                <div class="stock-header" style="text-align: center; padding: 15px 15px 10px 15px;">
                    <h1 style="margin: 0; font-size: 1.2rem;">📊 Resultados de Búsqueda</h1>
                    <p id="resultsSubtitle" style="margin: 4px 0 10px 0; font-size: 0.8rem;">0 resultados encontrados</p>
                    
                    <!-- ====== CONTROLES DE PAGINACIÓN (ARRIBA) ====== -->
                    <div id="paginationControlsTop" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.3); border-bottom: 1px solid rgba(255,255,255,0.3);">
                        <span id="paginationInfoTop" style="font-size: 0.75rem; color: #1a1a2e; font-weight: 600;">Mostrando 0 de 0</span>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn btn-small btn-back" id="prevPageBtnTop" style="padding: 4px 12px; font-size: 0.7rem; margin: 0; background: rgba(26,26,46,0.8); color: white;">◀</button>
                            <span id="pageIndicatorTop" style="font-size: 0.75rem; color: #1a1a2e; font-weight: 600; display: flex; align-items: center; padding: 0 8px;">Página 1</span>
                            <button class="btn btn-small btn-back" id="nextPageBtnTop" style="padding: 4px 12px; font-size: 0.7rem; margin: 0; background: rgba(26,26,46,0.8); color: white;">▶</button>
                        </div>
                    </div>
                    
                    <!-- ====== BOTONES DE ACCIÓN (ARRIBA) ====== -->
                    <div class="action-buttons-top" id="actionButtonsTop" style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn btn-small btn-secondary" id="downloadImageBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                            📥 Descargar
                        </button>
                        <button class="btn btn-small btn-success" id="shareImageBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                            📤 Compartir
                        </button>
                        <button class="btn btn-small btn-back" id="newSearchBtnTop" style="padding: 6px 12px; font-size: 0.7rem; margin: 0; flex: 1; min-width: 80px;">
                            ◀ Nueva
                        </button>
                    </div>
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
            prevPageBtnTop: this.container.querySelector('#prevPageBtnTop'),
            nextPageBtnTop: this.container.querySelector('#nextPageBtnTop'),
            pageIndicatorTop: this.container.querySelector('#pageIndicatorTop'),
            paginationInfoTop: this.container.querySelector('#paginationInfoTop'),
            downloadImageBtnTop: this.container.querySelector('#downloadImageBtnTop'),
            shareImageBtnTop: this.container.querySelector('#shareImageBtnTop'),
            newSearchBtnTop: this.container.querySelector('#newSearchBtnTop'),
            actionButtonsTop: this.container.querySelector('#actionButtonsTop'),
        };
        this.messageEl = this.container.querySelector('#stockMessage');
    }

    _setupEventListeners() {
        if (this.elements.searchBtn) {
            this.elements.searchBtn.addEventListener('click', () => this._buscar());
        }
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._buscar();
            });
        }

        if (this.elements.prevPageBtnTop) {
            this.elements.prevPageBtnTop.addEventListener('click', () => this._cambiarPagina(-1));
        }
        if (this.elements.nextPageBtnTop) {
            this.elements.nextPageBtnTop.addEventListener('click', () => this._cambiarPagina(1));
        }

        if (this.elements.downloadImageBtnTop) {
            this.elements.downloadImageBtnTop.addEventListener('click', () => this._descargarImagen());
        }
        if (this.elements.shareImageBtnTop) {
            this.elements.shareImageBtnTop.addEventListener('click', () => this._compartirImagen());
        }
        if (this.elements.newSearchBtnTop) {
            this.elements.newSearchBtnTop.addEventListener('click', () => this._volver());
        }

        if (this.elements.resultsTable) {
            this.elements.resultsTable.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-sort]');
                if (th) {
                    this._ordenarPor(th.dataset.sort);
                }
            });
        }
    }

    async _cargarDatos() {
        mostrarMensaje('📂 Cargando datos de repuestos...', 'info', 0);
        this.datos = await this.loader.cargar();
        if (this.loader.usaEjemplo) {
            mostrarMensaje(`⚠️ Usando datos de ejemplo (${this.datos.length} repuestos)`, 'info', 4000);
        }
    }

    _poblarFiltros() {
        const select = this.elements.categoryFilter;
        const categorias = this.loader.obtenerCategorias();
        
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

        if (!termino && !categoria) {
            mostrarMensaje('⚠️ Introduce un término de búsqueda o selecciona una categoría', 'info', 3000);
            return;
        }

        this.terminoBusqueda = termino;
        this.categoriaBusqueda = categoria;

        this.filtrados = this.loader.buscar(termino, categoria);
        this.paginaActual = 1;
        this.cachedImage = null;

        if (this.filtrados.length === 0) {
            mostrarMensaje(`🔍 No se encontraron resultados${termino ? ` para "${termino}"` : ''}${categoria ? ` en ${categoria}` : ''}`, 'info', 3000);
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
            this._actualizarPaginacionTop(0, 0, 1, 1);
            return;
        }

        await this._mostrarResultados();
    }

    async _mostrarResultados() {
        this.elements.searchScreen.style.display = 'none';
        this.elements.resultsScreen.style.display = 'block';

        this.elements.resultsSubtitle.textContent = 
            `🔍 ${this.filtrados.length} resultados encontrados${this.terminoBusqueda ? ` para "${this.terminoBusqueda}"` : ''}${this.categoriaBusqueda ? ` en ${this.categoriaBusqueda}` : ''}`;

        this._renderPagina();
        mostrarMensaje(`✅ ${this.filtrados.length} resultados encontrados`, 'success', 2000);
    }

    _actualizarPaginacionTop(inicio, fin, total, totalPaginas) {
        const info = this.elements.paginationInfoTop;
        const indicator = this.elements.pageIndicatorTop;
        const prevBtn = this.elements.prevPageBtnTop;
        const nextBtn = this.elements.nextPageBtnTop;

        if (info) {
            info.textContent = total > 0 ? `Mostrando ${inicio + 1}-${fin} de ${total}` : 'Mostrando 0 de 0';
        }
        if (indicator) {
            indicator.textContent = `Página ${this.paginaActual} de ${totalPaginas || 1}`;
        }
        if (prevBtn) {
            prevBtn.style.display = this.paginaActual > 1 ? 'inline-block' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = this.paginaActual < totalPaginas ? 'inline-block' : 'none';
        }
    }

    _renderPagina() {
        const total = this.filtrados.length;
        const porPagina = this.resultadosPorPagina;
        const totalPaginas = Math.ceil(total / porPagina);
        
        if (this.paginaActual < 1) this.paginaActual = 1;
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

        this._actualizarPaginacionTop(inicio, fin, total, totalPaginas);
        this.cachedImage = null;
    }

    _cambiarPagina(delta) {
        const total = this.filtrados.length;
        const totalPaginas = Math.ceil(total / this.resultadosPorPagina);
        const nuevaPagina = this.paginaActual + delta;
        
        if (nuevaPagina < 1 || nuevaPagina > totalPaginas) {
            mostrarMensaje(`⚠️ Ya estás en la ${nuevaPagina < 1 ? 'primera' : 'última'} página`, 'info', 2000);
            return;
        }
        
        this.paginaActual = nuevaPagina;
        this._renderPagina();
        this.cachedImage = null;
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
            mostrarMensaje('⚠️ No hay datos en esta página para generar imagen', 'info', 3000);
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
            mostrarMensaje('❌ Error al generar la imagen', 'error', 3000);
            return null;
        }
    }

    async _descargarImagen() {
        if (this.filtrados.length === 0) {
            mostrarMensaje('⚠️ No hay resultados para descargar', 'info', 3000);
            return;
        }

        mostrarMensaje('🖼️ Generando imagen...', 'info', 0);

        const imageData = await this._generarImagen();
        if (!imageData) {
            mostrarMensaje('❌ Error al generar la imagen', 'error', 3000);
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
            mostrarMensaje('📥 Imagen descargada', 'success', 2000);
        } catch (error) {
            console.error('[StockApp] Error descargando:', error);
            mostrarMensaje('❌ Error al descargar', 'error', 3000);
        }
    }

    async _compartirImagen() {
        if (this.filtrados.length === 0) {
            mostrarMensaje('⚠️ No hay resultados para compartir', 'info', 3000);
            return;
        }

        mostrarMensaje('🖼️ Generando imagen...', 'info', 0);

        const imageData = await this._generarImagen();
        if (!imageData) {
            mostrarMensaje('❌ Error al generar la imagen', 'error', 3000);
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
                mostrarMensaje('📤 Compartido correctamente', 'success', 2000);
            } else {
                mostrarMensaje('📱 Compartir no soportado, se descargará', 'info', 2000);
                this._descargarImagen();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[StockApp] Error compartiendo:', error);
                mostrarMensaje('❌ Error al compartir', 'error', 3000);
            }
        }
    }

    _volver() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.value = '';
        }
        
        this.elements.resultsScreen.style.display = 'none';
        this.elements.searchScreen.style.display = 'block';
        
        this.filtrados = [];
        this.paginaActual = 1;
        this.cachedImage = null;
        this._ultimaOrden = null;
        this._ordenAscendente = true;
        this.terminoBusqueda = '';
        this.categoriaBusqueda = '';
        
        mostrarMensaje('🔄 Campos limpiados. Realiza una nueva búsqueda.', 'info', 2000);
    }
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('[StockApp] DOM cargado, iniciando...');
    setTimeout(() => {
        window.stockApp = new StockApp();
    }, 150);
});